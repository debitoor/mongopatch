var util = require('util');

var mongojs = require('mongojs');
var stream = require('stream-wrapper');
var semver = require('semver');
var moment = require('moment');
var async = require('async');

var streams = require('./streams');
var log = require('./log');

var packageJson = require('../package.json');

var TMP_COLLECTION = '_mongopatch_tmp';

var emit = function(event, dest, src) {
	src.on(event, function() {
		var args = Array.prototype.slice.call(arguments);
		args.unshift(event);

		dest.emit.apply(dest, args);
	});
};

var name = function(collection) {
	return 'patch_' + moment().format('YYYYMMDD.HHmmss.SSS') + '_' + collection.toString();
};

var create = function(patch, options) {
	var applicationDb = mongojs(options.db);
	var logDb = options.logDb && mongojs(options.logDb);

	var that = stream.transform({ objectMode: true },
		function(data, encoding, callback) {
			callback(null, data);
		},
		function(callback) {
			teardown(callback);
		});

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

	that.options = options;
	that.db = applicationDb;
	that.id = null;

	that.version = function(version) {
		that._version = version;
	};
	that.setup = function(callback) {
		that._setup = callback;
	};
	that.update = function(collection, query, worker) {
		if(!worker) {
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
		if(!that._version || !semver.eq(that._version, packageJson.version)) {
			var err = new Error(util.format('Specified version (%s) does not match current system version (%s)', that._version, packageJson.version));
			return callback(err);
		}
		if(!that._update) {
			return callback(new Error('Update missing'));
		}

		var setupCallback = that._setup || function(fn) {
			fn();
		};

		setupCallback(function(err) {
			if(err) {
				return callback(err);
			}

			that.on('data', function(data) {
				progress = data.progress;
			});

			callback();
		});
	};
	var update = function() {
		var collection = that._update.collection;
		var query = that._update.query;
		var worker = that._update.worker;

		var logCollection = logDb && logDb.collection(that.id);

		var opts = { afterCallback: that._after, concurrency: options.parallel };
		var stream = streams.patch(collection, query, { concurrency: options.parallel }, worker);

		emit('error', that, stream);

		if(options.dryRun) {
			var tmpCollection = applicationDb.collection(TMP_COLLECTION);
			var tmpStream = logCollection ? streams.logged.tmp(logCollection, tmpCollection, opts) : streams.tmp(tmpCollection, opts);

			stream = stream.pipe(tmpStream);
		} else {
			var updateStream = logCollection ? streams.logged.update(logCollection, opts) : streams.update(opts);

			stream = stream.pipe(updateStream);
		}

		emit('error', that, stream);

		collection.count(query, function(err, count) {
			if(err) {
				return that.emit('error', err);
			}

			stream = stream.pipe(streams.progress(count));

			if(options.output) {
				stream = stream.pipe(log({ patch: that.id, total: count }));
				that.on('error', log.error);
			}

			stream
				.pipe(that)
				.resume();
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
			if(err) {
				return callback(err);
			}

			async.parallel([
				function(next) {
					applicationDb.close(next);
				},
				function(next) {
					if(!logDb) {
						return next();
					}

					logDb.close(next);
				}
			], callback);
		});
	};

	patch(that);

	setup(function(err) {
		if(err) {
			return that.emit('error', err);
		}

		update();
	});

	return that;
};

module.exports = create;
