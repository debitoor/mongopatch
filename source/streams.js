var async = require('async');
var parallel = require('parallel-transform');
var bson = new (require('bson').pure().BSON)();

var diff = require('./diff');

var DEFAULT_CONCURRENCY = 1;

var bsonCopy = function(obj) {
	return bson.deserialize(bson.serialize(obj));
};

var jsonCopy = function(obj) {
	return JSON.parse(JSON.stringify(obj));
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
		before: patch.document,
		after: patch.updatedDocument,
		modified: !!Object.keys(patch.diff.document).length,
		diff: patch.diff.document
	});

	afterCallback(update, callback);
};

var applyDiff = function(acc, patch) {
	patch.diff = {
		accumulated: jsonCopy(diff(patch.document, patch.updatedDocument, { accumulated: acc, group: true })),
		document: diff.deep(patch.document, patch.updatedDocument)
	};

	return patch;
};

var applyUpdate = function(patch, callback) {
	patch.collection.findAndModify({
		query: { _id: patch.document._id },
		'new': true,
		update: patch.modifier
	}, function(err, updatedDocument) {
		// Ensure arity
		callback(err, updatedDocument);
	});
};

var applyTmp = function(tmpCollection, patch, callback) {
	var id = patch.document._id;
	var updatedDocument;

	async.waterfall([
		function(next) {
			tmpCollection.save(patch.document, next);
		},
		function(savedDocument, _, next) {
			tmpCollection.findAndModify({
				query: { _id: id },
				'new': true,
				update: patch.modifier
			}, next);
		},
		function(result, _, next) {
			updatedDocument = result;
			tmpCollection.remove({ _id: id }, next);
		},
		function() {
			callback(null, updatedDocument);
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

	var accDiff = {};

	return parallel(options.concurrency, function(patch, callback) {
		var document = patch.document;
		var id = document._id;

		var logDocument;

		async.waterfall([
			function(next) {
				logCollection.insert({
					_id: id,
					before: document,
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
			function(updatedDocument, next) {
				patch.updatedDocument = updatedDocument;

				applyDiff(accDiff, patch);

				var modified = !!Object.keys(patch.diff.document).length;

				logCollection.update(
					{ _id: logDocument._id },
					{ $set: { after: updatedDocument, modified: modified, diff: patch.diff.document } },
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

	var accDiff = {};

	return parallel(options.concurrency, function(patch, callback) {
		async.waterfall([
			function(next) {
				fn(patch, next);
			},
			function(updatedDocument, next) {
				patch.updatedDocument = updatedDocument;

				applyDiff(accDiff, patch);
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

var patchStream = function(collection, worker, options) {
	options = extend({
		concurrency: DEFAULT_CONCURRENCY,
		query: {}
	}, options);

	options.query = options.query || {};

	var patch = parallel(options.concurrency, function(document, callback) {
		var clone = bsonCopy(document);

		worker(document, function(err, modifier) {
			if (err) {
				err.patch = {
					document: clone,
					modifier: modifier
				};

				return callback(err);
			}
			if(!modifier) {
				return callback();
			}

			callback(null, {modifier:modifier, document:clone, query:options.query, collection:collection});
		});
	});

	collection
		.find(options.query)
		.sort({ _id: 1 })
		.pipe(patch);

	return patch;
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
exports.update = updateStream;
exports.tmp = tmpStream;

exports.logged.update = loggedUpdateStream;
exports.logged.tmp = loggedTmpStream;
