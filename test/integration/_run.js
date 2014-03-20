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
	it('should run an update with query', function(done) {
		run(patch, mixin({ update: 'query' }), done);
	});

	it('should run an update with query and parallel', function(done) {
		run(patch, mixin({ update: 'query', parallel: PARALLEL }), done);
	});

	it('should run an update with query and log db', function(done) {
		run(patch, mixin({ update: 'query', logDb: LOG_DB }), done);
	});

	it('should run an update with query, parallel and log db', function(done) {
		run(patch, mixin({ update: 'query', parallel: PARALLEL, logDb: LOG_DB }), done);
	});

	it('should run an update with document', function(done) {
		run(patch, mixin({ update: 'document' }), done);
	});

	it('should run an update with document and parallel', function(done) {
		run(patch, mixin({ update: 'document', parallel: PARALLEL }), done);
	});

	it('should run an update with document and log db', function(done) {
		run(patch, mixin({ update: 'document', logDb: LOG_DB }), done);
	});

	it('should run an update with document, parallel and log db', function(done) {
		run(patch, mixin({ update: 'document', parallel: PARALLEL, logDb: LOG_DB }), done);
	});

	it('should run an update with dummy', function(done) {
		run(patch, mixin({ update: 'dummy' }), done);
	});

	it('should run an update with dummy and parallel', function(done) {
		run(patch, mixin({ update: 'dummy', parallel: PARALLEL }), done);
	});

	it('should run an update with dummy and log db', function(done) {
		run(patch, mixin({ update: 'dummy', logDb: LOG_DB }), done);
	});

	it('should run an update with dummy, parallel and log db', function(done) {
		run(patch, mixin({ update: 'dummy', parallel: PARALLEL, logDb: LOG_DB }), done);
	});
};

var error = function(patch) {
	it('should run an update with query', function(done) {
		run(patch, mixin({ update: 'query' }), err(done));
	});

	it('should run an update with query and parallel', function(done) {
		run(patch, mixin({ update: 'query', parallel: PARALLEL }), err(done));
	});

	it('should run an update with query and log db', function(done) {
		run(patch, mixin({ update: 'query', logDb: LOG_DB }), err(done));
	});

	it('should run an update with query, parallel and log db', function(done) {
		run(patch, mixin({ update: 'query', parallel: PARALLEL, logDb: LOG_DB }), err(done));
	});

	it('should run an update with document', function(done) {
		run(patch, mixin({ update: 'document' }), err(done));
	});

	it('should run an update with document and parallel', function(done) {
		run(patch, mixin({ update: 'document', parallel: PARALLEL }), err(done));
	});

	it('should run an update with document and log db', function(done) {
		run(patch, mixin({ update: 'document', logDb: LOG_DB }), err(done));
	});

	it('should run an update with document, parallel and log db', function(done) {
		run(patch, mixin({ update: 'document', parallel: PARALLEL, logDb: LOG_DB }), err(done));
	});

	it('should run an update with dummy', function(done) {
		run(patch, mixin({ update: 'dummy' }), err(done));
	});

	it('should run an update with dummy and parallel', function(done) {
		run(patch, mixin({ update: 'dummy', parallel: PARALLEL }), err(done));
	});

	it('should run an update with dummy and log db', function(done) {
		run(patch, mixin({ update: 'dummy', logDb: LOG_DB }), err(done));
	});

	it('should run an update with dummy, parallel and log db', function(done) {
		run(patch, mixin({ update: 'dummy', parallel: PARALLEL, logDb: LOG_DB }), err(done));
	});
};

exports.test = test;
exports.error = error;
