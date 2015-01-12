var fs = require('fs');
var util = require('util');
var path = require('path');

var async = require('async');
var streams = require('stream-wrapper');
var parallel = require('parallel-transform');
var speedometer = require('speedometer');
var stringify = require('json-stable-stringify');
var bson = new (require('bson').pure().BSON)();
var mongojs = require('mongojs');
var traverse = require('traverse');

var diff = require('./diff');

var DEFAULT_CONCURRENCY = 1;
var ATTEMPT_LIMIT = 5;

var JSON_STRINGIFY_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'node_modules', 'json-stable-stringify', 'index.js'), 'utf-8');
var COMPARE_TEMPLATE = fs.readFileSync(path.join(__dirname, 'compare.js.txt'), 'utf-8');

var bsonCopy = function(obj) {
	return bson.deserialize(bson.serialize(obj));
};

var extend = function(dest, src) {
	if(!src) {
		return dest;
	}

	Object.keys(src).forEach(function(key) {
		var v = src[key];
		dest[key] = v === undefined ? dest[key] : v;
	});

	return dest;
};

var noopCallback = function(doc, callback) {
	callback();
};

var applyAfterCallback = function(afterCallback, patch, callback) {
	var update = bsonCopy({
		before: patch.before,
		after: patch.after,
		modified: patch.modified,
		diff: patch.diff
	});

	afterCallback(update, callback);
};

var applyUpdateUsingQuery = function(patch, callback) {
	var query = bsonCopy(patch.query);
	query._id = patch.before._id;

	patch.collection.findAndModify({
		query: query,
		'new': true,
		update: patch.modifier
	}, function(err, after) {
		// Ensure arity
		callback(err, after);
	});
};

var applyUpdateUsingWhere = function(patch, callback) {
	var document = traverse(patch.before).map(function(value) {
		if(value instanceof mongojs.ObjectId) {
			this.update(value.toJSON(), true);
		} else if(value instanceof Date) {
			this.update(value.toJSON(), true);
		} else if(value instanceof mongojs.NumberLong) {
			this.update(value.toNumber(), true);
		} else if(value instanceof mongojs.Timestamp) {
			this.update(util.format('%s:%s', value.getLowBits(), value.getHighBits()), true);
		}
	});

	document = JSON.stringify(stringify(document));

	var where = util.format(COMPARE_TEMPLATE, JSON_STRINGIFY_SOURCE, document);
	var query = { _id: patch.before._id };
	query.$where = where;

	patch.collection.findAndModify({
		query: query,
		'new': true,
		update: patch.modifier
	}, function(err, after) {
		callback(err, after);
	});
};

var applyUpdateUsingDocument = function(worker, patch, callback) {
	if(patch.attempts === ATTEMPT_LIMIT) {
		// In some cases a document doesn't match itself when used
		// as a query (perhaps a bug). Try one last time using the slow
		// where operator.

		patch.attempts++;
		return applyUpdateUsingWhere(patch, callback);
	}

	async.waterfall([
		function(next) {
			// Make sure if additional properties have been added to the root
			// of the document we still satisfy the query.
			var query = { $and: [bsonCopy(patch.before), bsonCopy(patch.query)] };

			patch.collection.findAndModify({
				query: query,
				'new': true,
				update: patch.modifier
			}, next);
		},
		function(after, _, next) {
			if(after) {
				return callback(null, after);
			}

			var query = bsonCopy(patch.query);
			query._id = patch.before._id;

			patch.collection.findOne(query, next);
		},
		function(document, next) {
			if(!document) {
				// The document doesn't meet the criteria anymore
				return callback(null, null);
			}

			patch.before = document;
			patch.modifier = null;

			worker(document, function(err, modifier) {
				if(err) {
					err.patch = patch;
				}

				next(err, modifier);
			});
		},
		function(modifier) {
			if(!modifier) {
				return callback(null, null);
			}

			patch.modifier = modifier;
			patch.attempts++;

			applyUpdateUsingDocument(worker, patch, callback);
		}
	], callback);
};

var applyUpdateDummy = function(tmpCollection, patch, callback) {
	var id = patch.before._id;
	var after;

	async.waterfall([
		function(next) {
			tmpCollection.save(patch.before, next);
		},
		function(savedDocument, _, next) {
			tmpCollection.findAndModify({
				query: { _id: id },
				'new': true,
				update: patch.modifier
			}, next);
		},
		function(result, _, next) {
			after = result;
			tmpCollection.remove({ _id: id }, next);
		},
		function() {
			callback(null, after);
		}
	], callback);
};

var loggedTransformStream = function(logCollection, options, fn) {
	if(!fn) {
		fn = options;
		options = null;
	}

	options = extend({
		afterCallback: noopCallback,
		diffObject: false,
		concurrency: DEFAULT_CONCURRENCY
	}, options);

	return parallel(options.concurrency, function(patch, callback) {
		var logDocument;

		async.waterfall([
			function(next) {
				logCollection.insert({
					before: patch.before,
					collection: patch.collection.toString(),
					query: JSON.stringify(patch.query),
					modifier: JSON.stringify(patch.modifier),
					modified: false,
					createdAt: new Date()
				}, next);
			},
			function(result, _, next) {
				logDocument = result;
				patch.attempts = patch.attempts || 1;

				fn(patch, next);
			},
			function(after, next) {
				patch.skipped = !after;
				patch.modified = false;

				if(patch.skipped) {
					return logCollection.update({ _id: logDocument._id }, { $set: { modified: false, skipped: true, attempts: patch.attempts } },
						function(err) {
							callback(err, patch);
						}
					);
				}

				patch.after = after;
				patch.diff = diff.deep(patch.before, patch.after, { object: options.diffObject });
				patch.modified = !!Object.keys(patch.diff).length;

				logCollection.update(
					{ _id: logDocument._id },
					{ $set: { after: after, modified: patch.modified, skipped: false, diff: patch.diff, attempts: patch.attempts } },
					next
				);
			},
			function(_, next) {
				applyAfterCallback(options.afterCallback, patch, next);
			},
			function() {
				callback(null, patch);
			}
		], function(err) {
			if(err) {
				err.patch = patch;
			}
			if(err && logDocument) {
				var documentError = {
					message: err.message,
					stack: err.stack
				};

				logCollection.update(
					{ _id: logDocument._id },
					{ $set: { error: documentError } },
					function() {
						callback(err);
					}
				);

				return;
			}

			callback(err);
		});
	});
};

var transformStream = function(options, fn) {
	if(!fn) {
		fn = options;
		options = null;
	}

	options = extend({
		afterCallback: noopCallback,
		diffObject: false,
		concurrency: DEFAULT_CONCURRENCY
	}, options);

	return parallel(options.concurrency, function(patch, callback) {
		async.waterfall([
			function(next) {
				patch.attempts = patch.attempts || 1;
				fn(patch, next);
			},
			function(after, next) {
				patch.skipped = !after;
				patch.modified = false;

				if(patch.skipped) {
					return callback(null, patch);
				}

				patch.after = after;
				patch.diff = diff.deep(patch.before, patch.after, { object: options.diffObject });
				patch.modified = !!Object.keys(patch.diff).length;

				applyAfterCallback(options.afterCallback, patch, next);
			},
			function() {
				callback(null, patch);
			}
		], function(err) {
			if(err) {
				err.patch = patch;
			}

			callback(err);
		});
	});
};

var patchStream = function(collection, query, options, worker) {
	if(!worker) {
		worker = options;
		options = null;
	}

	query = query || {};
	options = extend({ concurrency: DEFAULT_CONCURRENCY }, options);

	var patch = parallel(options.concurrency, function(document, callback) {
		var clone = bsonCopy(document);

		worker(document, function(err, modifier) {
			if (err) {
				err.patch = {
					before: clone,
					modifier: modifier
				};

				return callback(err);
			}
			if(!modifier) {
				return callback();
			}

			callback(null, { modifier:modifier, before:clone, query:query, collection:collection });
		});
	});

	collection
		.find(query, {}, { timeout: false })
		.sort({ _id: 1 })
		.pipe(patch);

	return patch;
};

var progressStream = function(total) {
	var delta = {};
	var count = 0;
	var modified = 0;
	var skipped = 0;
	var started = Date.now();
	var speed = speedometer(); // documents per second

	return streams.transform({ objectMode: true }, function(patch, encoding, callback) {
		count++;
		modified += (patch.modified ? 1 : 0);
		skipped += (patch.skipped ? 1 : 0);

		var currentSpeed = speed(1);
		var remaining = Math.max(total - count, 0);

		var diffed = patch.skipped ? delta : diff(patch.before, patch.after, { accumulate: delta, group: true });

		patch.progress = {
			total: total,
			count: count,
			modified: modified,
			skipped: skipped,
			speed: currentSpeed,
			remaining: remaining,
			eta: Math.round(remaining / currentSpeed),
			time: Math.round((Date.now() - started) / 1000),
			percentage: (100 * count / total),
			diff: bsonCopy(diffed)
		};

		callback(null, patch);
	});
};

var updateUsingQueryStream = function(options) {
	return transformStream(options, applyUpdateUsingQuery);
};

var updateUsingDocumentStream = function(worker, options) {
	return transformStream(options, function(patch, callback) {
		applyUpdateUsingDocument(worker, patch, callback);
	});
};

var updateDummyStream = function(tmpCollection, options) {
	return transformStream(options, function(patch, callback) {
		applyUpdateDummy(tmpCollection, patch, callback);
	});
};

var loggedUpdateUsingQueryStream = function(logCollection, options) {
	return loggedTransformStream(logCollection, options, applyUpdateUsingQuery);
};

var loggedUpdateUsingDocumentStream = function(logCollection, worker, options) {
	return loggedTransformStream(logCollection, options, function(patch, callback) {
		applyUpdateUsingDocument(worker, patch, callback);
	});
};

var loggedUpdateDummyStream = function(logCollection, tmpCollection, options) {
	return loggedTransformStream(logCollection, options, function(patch, callback) {
		applyUpdateDummy(tmpCollection, patch, callback);
	});
};

exports.logged = {};

exports.patch = patchStream;
exports.progress = progressStream;

exports.updateUsingQuery = updateUsingQueryStream;
exports.updateUsingDocument = updateUsingDocumentStream;
exports.updateDummy = updateDummyStream;

exports.logged.updateUsingQuery = loggedUpdateUsingQueryStream;
exports.logged.updateUsingDocument = loggedUpdateUsingDocumentStream;
exports.logged.updateDummy = loggedUpdateDummyStream;
