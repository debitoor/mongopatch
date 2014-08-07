var spawn = require('win-spawn');
var path = require('path');

var once = require('once');
var async = require('async');

var PARALLEL = '10';
var LOG_DB = helper.logDb.toString();

var MONGOPATCH = path.join(__dirname, '../../../bin/mongopatch.js');

var run = function(args, callback) {
	callback = once(callback);

	async.waterfall([
		function(next) {
			helper.loadAllFixtures(next);
		},
		function(_, next) {
			var output = process.env.MONGOPATCH_TEST_OUTPUT === 'true';

			var mp = spawn(MONGOPATCH, args, {
				stdio: output ? 'inherit' : 'ignore'
			});

			mp.on('exit', function(code) {
				if (code) {
					return callback(new Error('mongopatch exited unexpectedly with code: ' + code));
				}

				callback();
			});
			mp.on('error', function(err) {
				callback(err);
			});
		}
	], callback);
};

var args = function() {
	var options = Array.prototype.slice.call(arguments);
	options.push('--db', helper.db.toString(), '--output', 'true');

	return options;
};

var err = function(callback) {
	return function(err) {
		if(!err) {
			return callback(new Error('Expected error'));
		}

		callback();
	};
};

var test = function(patch) {
	it('should run an update with query', function(done) {
		run(args(patch, '--update', 'query', '--force'), done);
	});

	it('should run an update with query and parallel', function(done) {
		run(args(patch, '--update', 'query', '--force', '--parallel', PARALLEL), done);
	});

	it('should run an update with query and log db', function(done) {
		run(args(patch, '--update', 'query', '--force', '--log-db', LOG_DB), done);
	});

	it('should run an update with query, parallel and log db', function(done) {
		run(args(patch, '--update', 'query', '--force', '--parallel', PARALLEL, '--log-db', LOG_DB), done);
	});

	it('should run an update with document', function(done) {
		run(args(patch, '--update', 'document', '--force'), done);
	});

	it('should run an update with document and parallel', function(done) {
		run(args(patch, '--update', 'document', '--force', '--parallel', PARALLEL), done);
	});

	it('should run an update with document and log db', function(done) {
		run(args(patch, '--update', 'document', '--force', '--log-db', LOG_DB), done);
	});

	it('should run an update with document, parallel and log db', function(done) {
		run(args(patch, '--update', 'document', '--force', '--parallel', PARALLEL, '--log-db', LOG_DB), done);
	});

	it('should run an update with dummy', function(done) {
		run(args(patch, '--update', 'dummy', '--force'), done);
	});

	it('should run an update with dummy and parallel', function(done) {
		run(args(patch, '--update', 'dummy', '--force', '--parallel', PARALLEL), done);
	});

	it('should run an update with dummy and log db', function(done) {
		run(args(patch, '--update', 'dummy', '--force', '--log-db', LOG_DB), done);
	});

	it('should run an update with dummy, parallel and log db', function(done) {
		run(args(patch, '--update', 'dummy', '--force', '--parallel', PARALLEL, '--log-db', LOG_DB), done);
	});
};

var error = function(patch) {
	it('should run an update with query', function(done) {
		run(args(patch, '--update', 'query', '--force'), err(done));
	});

	it('should run an update with query and parallel', function(done) {
		run(args(patch, '--update', 'query', '--force', '--parallel', PARALLEL), err(done));
	});

	it('should run an update with query and log db', function(done) {
		run(args(patch, '--update', 'query', '--force', '--log-db', LOG_DB), err(done));
	});

	it('should run an update with query, parallel and log db', function(done) {
		run(args(patch, '--update', 'query', '--force', '--parallel', PARALLEL, '--log-db', LOG_DB), err(done));
	});

	it('should run an update with document', function(done) {
		run(args(patch, '--update', 'document', '--force'), err(done));
	});

	it('should run an update with document and parallel', function(done) {
		run(args(patch, '--update', 'document', '--force', '--parallel', PARALLEL), err(done));
	});

	it('should run an update with document and log db', function(done) {
		run(args(patch, '--update', 'document', '--force', '--log-db', LOG_DB), err(done));
	});

	it('should run an update with document, parallel and log db', function(done) {
		run(args(patch, '--update', 'document', '--force', '--parallel', PARALLEL, '--log-db', LOG_DB), err(done));
	});

	it('should run an update with dummy', function(done) {
		run(args(patch, '--update', 'dummy', '--force'), err(done));
	});

	it('should run an update with dummy and parallel', function(done) {
		run(args(patch, '--update', 'dummy', '--force', '--parallel', PARALLEL), err(done));
	});

	it('should run an update with dummy and log db', function(done) {
		run(args(patch, '--update', 'dummy', '--force', '--log-db', LOG_DB), err(done));
	});

	it('should run an update with dummy, parallel and log db', function(done) {
		run(args(patch, '--update', 'dummy', '--force', '--parallel', PARALLEL, '--log-db', LOG_DB), err(done));
	});
};

exports.test = test;
exports.error = error;
