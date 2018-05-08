var util = require('util');

var mongojs = require('mongojs');
var semver = require('semver');
var moment = require('moment');
var async = require('async');
var transform = require('stream-wrapper').transform;

var streams = require('./streams');

var packageJson = require('../package.json');

var TMP_COLLECTION = '_mongopatch_tmp';

var getCollection = function(db, collection) {
	if (typeof collection === 'string') {
		return db && db.collection(collection);
	}

	return collection;
};

var getDatabase = function(db) {
	return (typeof db === 'string') ? mongojs(db) : db;
};

var closeDatabase = function(db, original) {
	var close = function(callback) {
		db.close(callback);
	};
	var noop = function(callback) {
		callback();
	};

	return (typeof original === 'string') && db ? close : noop;
};

var propagateError = function(src, dest) {
	src.on('error', function(err) {
		dest.emit('error', err);
	});
};

var name = function(collection) {
	return 'patch_' + moment().format('YYYYMMDD.HHmmss.SSS') + '_' + collection.toString();
};

var create = function(patch, options) {
	var applicationDb = getDatabase(options.db);
	var logDb = options.logDb && getDatabase(options.logDb);

	var closeApplicationDb = closeDatabase(applicationDb, options.db);
	var closeLogDb = closeDatabase(logDb, options.logDb);

	var progress = {
		total: 0,
		count: 0,
		modified: 0,
		speed: 0,
		remaining: 0,
		eta: 0,
		time: 0,
		percentage: 100,
		diff: {}
	};

	var that = transform({ objectMode: true },
		function(data, encoding, callback) {
			progress = data.progress;
			callback(null, data);
		},
		function(callback) {
			teardown(callback);
		});

	that.options = options;
	that.db = applicationDb;
	that.logDb = logDb;
	that.id = null;

	that.version = function(version) {
		that._version = version;
	};
	that.setup = function(callback) {
		that._setup = callback;
	};
	that.update = function(collection, query, worker) {
		if (!worker) {
			worker = query;
			query = null;
		}

		collection = applicationDb.collection(collection);

		that.id = name(collection);
		that._update = {
			collection: collection,
			query: query || {},
			worker: worker
		};
	};
	that.after = function(callback) {
		that._after = callback;
	};
	that.teardown = function(callback) {
		that._teardown = callback;
	};

	var setup = function(callback) {
		if (!that._version || !semver.eq(that._version, packageJson.version)) {
			var err = new Error(util.format('Specified version (%s) does not match current system version (%s)', that._version, packageJson.version));
			return callback(err);
		}
		if (!that._update) {
			return callback(new Error('Update missing'));
		}

		var setupCallback = that._setup || function(fn) {
			fn();
		};

		async.waterfall([
			function(next) {
				applicationDb.getCollectionNames(next);
			},
			function(collections, next) {
				var updateCollectionName = that._update.collection.toString();

				if (collections.indexOf(updateCollectionName) === -1) {
					return callback(new Error(util.format('The collection "%s" does not seem to exist', updateCollectionName)));
				}

				setupCallback(next);
			},
			function() {
				callback();
			}
		], callback);
	};
	var update = function() {
		var collection = that._update.collection;
		var query = that._update.query;
		var worker = that._update.worker;

		var logCollection = getCollection(logDb, options.logCollection || that.id);
		var updateStream;

		var updateOptions = { afterCallback: that._after, concurrency: options.parallel, diffObject: options.diffObject };
		var stream = streams.patch(collection, query, { concurrency: options.parallel }, worker);

		propagateError(stream, that);

		if (options.update === 'dummy') {
			var tmpCollection = applicationDb.collection(TMP_COLLECTION);

			updateStream = logCollection ?
				streams.logged.updateDummy(logCollection, tmpCollection, updateOptions) :
				streams.updateDummy(tmpCollection, updateOptions);
		} else if (options.update === 'query') {
			updateStream = logCollection ?
				streams.logged.updateUsingQuery(logCollection, updateOptions) :
				streams.updateUsingQuery(updateOptions);
		} else if (options.update === 'document') {
			updateStream = logCollection ?
				streams.logged.updateUsingDocument(logCollection, worker, updateOptions) :
				streams.updateUsingDocument(worker, updateOptions);
		}

		stream = stream.pipe(updateStream);
		propagateError(stream, that);

		collection.count(query, function(err, count) {
			if (err) {
				return that.emit('error', err);
			}

			stream = stream.pipe(streams.progress(count));
			propagateError(stream, that);

			stream.pipe(that);
		});
	};
	var teardown = function(callback) {
		var teardownCallback = that._teardown || function(_, fn) {
			fn();
		};

		var stats = {
			total: progress.count,
			modified: progress.modified,
			time: progress.time,
			speed: progress.time ? (progress.count / progress.time) : 0,
			diff: progress.diff
		};

		teardownCallback(stats, function(err) {
			if (err) {
				return callback(err);
			}

			async.parallel([
				closeApplicationDb,
				closeLogDb
			], err => callback(err));
		});
	};

	patch(that);

	setImmediate(function() {
		setup(function(err) {
			if (err) {
				return that.emit('error', err);
			}

			update();
		});
	});

	return that;
};

module.exports = create;
