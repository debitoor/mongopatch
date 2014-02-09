var async = require('async');
var streams = require('stream-wrapper');
var parallel = require('parallel-transform');
var speedometer = require('speedometer');
var bson = new (require('bson').pure().BSON)();

var diff = require('./diff');

var DEFAULT_CONCURRENCY = 1;

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

var applyUpdate = function(patch, callback) {
	var query = bsonCopy(patch.query);
	extend(query, { _id: patch.before._id });

	patch.collection.findAndModify({
		query: query,
		'new': true,
		update: patch.modifier
	}, function(err, after) {
		// Ensure arity
		callback(err, after);
	});
};

var applyTmp = function(tmpCollection, patch, callback) {
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
		concurrency: DEFAULT_CONCURRENCY
	}, options);

	return parallel(options.concurrency, function(patch, callback) {
		var id = patch.before._id;
		var logDocument;

		async.waterfall([
			function(next) {
				logCollection.insert({
					_id: id,
					before: patch.before,
					collection: patch.collection.toString(),
					query: JSON.stringify(patch.query),
					modifier: JSON.stringify(patch.modifier),
					modified: false,
					createdAt: new Date()
				}, next);
			},
			function(result, next) {
				logDocument = result[0];
				fn(patch, next);
			},
			function(after, next) {
				patch.skipped = !after;
				patch.modified = false;

				if(patch.skipped) {
					return logCollection.update({ _id: logDocument._id }, { $set: { skipped: true } }, function(err) {
						callback(err, patch);
					});
				}

				patch.after = after;
				patch.diff = diff.deep(patch.before, patch.after);
				patch.modified = !!Object.keys(patch.diff).length;

				logCollection.update(
					{ _id: logDocument._id },
					{ $set: { after: after, modified: patch.modified, diff: patch.diff } },
					function(err) {
						next(err);
					}
				);
			},
			function(next) {
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
		concurrency: DEFAULT_CONCURRENCY
	}, options);

	return parallel(options.concurrency, function(patch, callback) {
		async.waterfall([
			function(next) {
				fn(patch, next);
			},
			function(after, next) {
				patch.skipped = !after;
				patch.modified = false;

				if(patch.skipped) {
					return callback(null, patch);
				}

				patch.after = after;
				patch.diff = diff.deep(patch.before, patch.after);
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
			diff: bsonCopy(diff(patch.before, patch.after, { accumulate: delta, group: true }))
		};

		callback(null, patch);
	});
};

var updateStream = function(options) {
	return transformStream(options, applyUpdate);
};

var tmpStream = function(tmpCollection, options) {
	return transformStream(options, function(patch, callback) {
		applyTmp(tmpCollection, patch, callback);
	});
};

var loggedUpdateStream = function(logCollection, options) {
	return loggedTransformStream(logCollection, options, applyUpdate);
};

var loggedTmpStream = function(logCollection, tmpCollection, options) {
	return loggedTransformStream(logCollection, options, function(patch, callback) {
		applyTmp(tmpCollection, patch, callback);
	});
};

exports.logged = {};

exports.patch = patchStream;
exports.progress = progressStream;
exports.update = updateStream;
exports.tmp = tmpStream;

exports.logged.update = loggedUpdateStream;
exports.logged.tmp = loggedTmpStream;
