var async = require('async');
var xtend = require('xtend');

var index = helper.requireSource('index');
var patch = require('./patches/albums-rename-owner');

var PARALLEL = 10;
var LOG_DB = helper.logDb.toString();

var run = function(options, callback) {
	async.waterfall([
		function(next) {
			helper.loadFixture('albums', next);
		},
		function(_, next) {
			var stream = index(patch, options);
			helper.readStream(stream, next);
		},
		function(patches) {
			callback(null, patches);
		}
	], callback);
};

var mixin = function(options) {
	return xtend({
		db: helper.db.toString(),
		output: helper.env('output') === 'true'
	}, options);
};

describe('rename albums owner to user', function() {
	it('should run a real update', function(done) {
		run(mixin(), done);
	});

	it('should run a real update with parallel', function(done) {
		run(mixin({ parallel: PARALLEL }), done);
	});

	it('should run a real update with log db', function(done) {
		run(mixin({ logDb: LOG_DB }), done);
	});

	it('should run a real update with parallel and log db', function(done) {
		run(mixin({ parallel: PARALLEL, logDb: LOG_DB }), done);
	});

	it('should run a dry run', function(done) {
		run(mixin({ dryRun: true }), done);
	});

	it('should run a dry run with parallel', function(done) {
		run(mixin({ dryRun: true, parallel: PARALLEL }), done);
	});

	it('should run a dry run with log db', function(done) {
		run(mixin({ dryRun: true, logDb: LOG_DB }), done);
	});

	it('should run a dry run with parallel and log db', function(done) {
		run(mixin({ dryRun: true, parallel: PARALLEL, logDb: LOG_DB }), done);
	});
});
