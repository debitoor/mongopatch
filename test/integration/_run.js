var async = require('async');
var xtend = require('xtend');

var index = helper.requireSource('index');

var PARALLEL = 10;
var LOG_DB = helper.logDb.toString();

var run = function(patch, options, callback) {
	async.waterfall([
		function(next) {
			helper.loadAllFixtures(next);
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

var err = function(done) {
	return function(err) {
		if(!err) {
			return done(new Error('Expected error'));
		}

		done();
	};
};

var test = function(patch) {
	it('should run a real update', function(done) {
		run(patch, mixin(), done);
	});

	it('should run a real update with parallel', function(done) {
		run(patch, mixin({ parallel: PARALLEL }), done);
	});

	it('should run a real update with log db', function(done) {
		run(patch, mixin({ logDb: LOG_DB }), done);
	});

	it('should run a real update with parallel and log db', function(done) {
		run(patch, mixin({ parallel: PARALLEL, logDb: LOG_DB }), done);
	});

	it('should run a dry run', function(done) {
		run(patch, mixin({ dryRun: true }), done);
	});

	it('should run a dry run with parallel', function(done) {
		run(patch, mixin({ dryRun: true, parallel: PARALLEL }), done);
	});

	it('should run a dry run with log db', function(done) {
		run(patch, mixin({ dryRun: true, logDb: LOG_DB }), done);
	});

	it('should run a dry run with parallel and log db', function(done) {
		run(patch, mixin({ dryRun: true, parallel: PARALLEL, logDb: LOG_DB }), done);
	});
};

var error = function(patch) {
	it('should run a real update', function(done) {
		run(patch, mixin(), err(done));
	});

	it('should run a real update with parallel', function(done) {
		run(patch, mixin({ parallel: PARALLEL }), err(done));
	});

	it('should run a real update with log db', function(done) {
		run(patch, mixin({ logDb: LOG_DB }), err(done));
	});

	it('should run a real update with parallel and log db', function(done) {
		run(patch, mixin({ parallel: PARALLEL, logDb: LOG_DB }), err(done));
	});

	it('should run a dry run', function(done) {
		run(patch, mixin({ dryRun: true }), err(done));
	});

	it('should run a dry run with parallel', function(done) {
		run(patch, mixin({ dryRun: true, parallel: PARALLEL }), err(done));
	});

	it('should run a dry run with log db', function(done) {
		run(patch, mixin({ dryRun: true, logDb: LOG_DB }), err(done));
	});

	it('should run a dry run with parallel and log db', function(done) {
		run(patch, mixin({ dryRun: true, parallel: PARALLEL, logDb: LOG_DB }), err(done));
	});
};

exports.test = test;
exports.error = error;
