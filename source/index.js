var mongojs = require('mongojs');
var stream = require('stream-wrapper');
var semver = require('semver');
var util = require('util');

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

var create = function(patch, options) {
	var applicationDb = mongojs(options.db);
	var logDb = options.logDb && mongojs(options.logDb);

	var that = stream.passThrough({ objectMode: true });

	that.db = applicationDb;
	that.id = null;

	that.update = function(collection, query, worker) {
		if(!worker) {
			worker = query;
			query = null;
		}

		that.id = 'patch_' + Date.now() + '_' + collection;
		that._update = {
			collection: collection,
			query: query,
			worker: worker
		};
	};
	that.after = function(callback) {
		that._after = callback;
	};
	that.version = function(version) {
		that._version = version;
	};

	var update = function() {
		var collection = that._update.collection;
		var query = that._update.query;
		var worker = that._update.worker;

		var logCollection = logDb && logDb.collection(that.id);

		var opts = { afterCallback: that._after, concurrency: options.parallel };
		var stream = streams.patch(applicationDb.collection(collection), worker, { concurrency: options.parallel, query: query });

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

		applicationDb.collection(collection).count(query, function(err, count) {
			if(err) {
				return that.emit('error', err);
			}

			stream = stream.pipe(streams.progress(count));

			if(options.output) {
				stream = stream.pipe(log({ patch: that.id, total: count }));
			}

			stream = stream.pipe(that);

			stream.on('end', function() {
				applicationDb.close();
				logDb && logDb.close();
			});

			stream.resume();
		});
	};

	patch(that);

	setImmediate(function() {
		if(!that._version || !semver.eq(that._version, packageJson.version)) {
			return that.emit('error', new Error(util.format('Specified version (%s) does not match current system version (%s)',
				that._version, packageJson.version)));
		}
		if(!that._update) {
			return that.emit('error', new Error('Update missing'));
		}

		update();
	});

	return that;
};

module.exports = create;
