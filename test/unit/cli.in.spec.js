var fs = require('fs');
var os = require('os');
var path = require('path');

var mkdirp = require('mkdirp');
var rimraf = require('rimraf');

var input = helper.requireSource('cli/in');

var tmpFile = function(name) {
	return path.join(os.tmpdir(), 'mongopatch_test', name || '');
};

var writeFile = function(name, data, callback) {
	var p = tmpFile(name);

	mkdirp(path.dirname(p), function(err) {
		if(err) {
			return callback(err);
		}

		fs.writeFile(p, data, function(err) {
			callback(err, p);
		});
	});
};

var removeFile = function(callback) {
	rimraf(tmpFile(), callback);
};

describe('cli.in', function() {
	var result;

	describe('empty arguments', function() {
		before(function() {
			result = input([]);
		});

		it('should have patch option error', function() {
			chai.expect(result)
				.to.have.property('error')
				.to.contain.subset({ type: 'patch', data: { path: null } });
		});
	});

	describe('invalid patch path', function() {
		before(function() {
			result = input(['/path/does/not/exist']);
		});

		it('should have patch option error', function() {
			chai.expect(result)
				.to.have.property('error')
				.to.contain.subset({ type: 'patch', data: { path: '/path/does/not/exist' } });
		});
	});

	describe('valid patch path with unknown option', function() {
		before(function() {
			result = input([__filename, '--wet-run', 'true']);
		});

		it('should have unknown option error', function() {
			chai.expect(result)
				.to.have.property('error')
				.to.contain.subset({ type: 'invalid_option', data: { wetRun: 'true' } });
		});
	});

	describe('valid patch path with no db', function() {
		before(function() {
			result = input([__filename]);
		});

		it('should have db option error', function() {
			chai.expect(result)
				.to.have.property('error')
				.to.contain.subset({ type: 'invalid_option', data: { db: null } });
		});
	});

	describe('valid patch path with db and no log db', function() {
		before(function() {
			result = input([__filename, '--db', 'development']);
		});

		it('should have log db option error', function() {
			chai.expect(result)
				.to.have.property('error')
				.to.contain.subset({ type: 'invalid_option', data: { logDb: null } });
		});
	});

	describe('valid patch path with db and empty update', function() {
		before(function() {
			result = input([__filename, '--db', 'development', '--update']);
		});

		it('should have update option error', function() {
			chai.expect(result)
				.to.have.property('error')
				.to.contain.subset({ type: 'invalid_option', data: { update: true } });
		});
	});

	describe('valid patch path with db and invalid update', function() {
		before(function() {
			result = input([__filename, '--db', 'development', '--update', 'nothing']);
		});

		it('should have update option error', function() {
			chai.expect(result)
				.to.have.property('error')
				.to.contain.subset({ type: 'invalid_option', data: { update: 'nothing' } });
		});
	});

	describe('valid patch path, db and update with invalid setup', function() {
		before(function() {
			result = input([__filename, '--db', 'development', '--update', 'dummy', '--setup', '/path/does/not/exist']);
		});

		it('should have setup option error', function() {
			chai.expect(result)
				.to.have.property('error')
				.to.contain.subset({ type: 'invalid_option', data: { setup: '/path/does/not/exist' } });
		});
	});

	describe('valid patch path, db and update with invalid config', function() {
		before(function() {
			result = input([__filename, '--db', 'development', '--update', 'dummy', '--config', '/path/does/not/exist']);
		});

		it('should have config option error', function() {
			chai.expect(result)
				.to.have.property('error')
				.to.contain.subset({ type: 'config', data: { path: '/path/does/not/exist' } });
		});
	});

	describe('valid patch with db and log db', function() {
		before(function() {
			result = input([__filename, '--db', 'development', '--log-db', 'log']);
		});

		it('should have no error', function() {
			chai.expect(result).not.to.have.property('error');
		});

		it('should have valid options with db, log db and default update', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.contain.subset({
					db: 'development',
					logDb: 'log',
					update: 'document',
					dryRun: false,
					force: false,
					output: true
				});
		});
	});

	describe('valid patch with db and force', function() {
		before(function() {
			result = input([__filename, '--db', 'development', '--force']);
		});

		it('should have no error', function() {
			chai.expect(result).not.to.have.property('error');
		});

		it('should have no log db option', function() {
			chai.expect(result).not.to.have.deep.property('options.logDb');
		});

		it('should have valid options with db, force and default update', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.contain.subset({
					db: 'development',
					update: 'document',
					dryRun: false,
					force: true,
					output: true
				});
		});
	});

	describe('valid patch with db, log db and parallel', function() {
		before(function() {
			result = input([__filename, '--db', 'development', '--log-db', 'log', '--parallel', '100']);
		});

		it('should have no error', function() {
			chai.expect(result).not.to.have.property('error');
		});

		it('should have valid options with db, log db, default update and parallel', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.contain.subset({
					db: 'development',
					logDb: 'log',
					update: 'document',
					parallel: 100,
					dryRun: false,
					force: false,
					output: true
				});
		});
	});

	describe('valid patch with db, log db and default parallel', function() {
		before(function() {
			result = input([__filename, '--db', 'development', '--log-db', 'log', '--parallel']);
		});

		it('should have no error', function() {
			chai.expect(result).not.to.have.property('error');
		});

		it('should have valid options with db, log db, default update and default parallel', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.contain.subset({
					db: 'development',
					logDb: 'log',
					update: 'document',
					parallel: 10,
					dryRun: false,
					force: false,
					output: true
				});
		});
	});


	describe('valid patch with db, log db and update', function() {
		before(function() {
			result = input([__filename, '--db', 'development', '--log-db', 'log', '--update', 'query']);
		});

		it('should have no error', function() {
			chai.expect(result).not.to.have.property('error');
		});

		it('should have valid options with db, log db and update', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.contain.subset({
					db: 'development',
					logDb: 'log',
					update: 'query',
					dryRun: false,
					force: false,
					output: true
				});
		});
	});

	describe('valid patch with db and dummy update', function() {
		before(function() {
			result = input([__filename, '--db', 'development', '--update', 'dummy']);
		});

		it('should have no error', function() {
			chai.expect(result).not.to.have.property('error');
		});

		it('should have no log db option', function() {
			chai.expect(result).not.to.have.deep.property('options.logDb');
		});

		it('should have valid options with db and update', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.contain.subset({
					db: 'development',
					update: 'dummy',
					dryRun: true,
					force: false,
					output: true
				});
		});
	});

	describe('valid patch with db, log db and dummy update', function() {
		before(function() {
			result = input([__filename, '--db', 'development', '--log-db', 'log', '--update', 'dummy']);
		});

		it('should have no error', function() {
			chai.expect(result).not.to.have.property('error');
		});

		it('should have valid options with db, log db and update', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.contain.subset({
					db: 'development',
					logDb: 'log',
					update: 'dummy',
					dryRun: true,
					force: false,
					output: true
				});
		});
	});

	describe('valid patch with db and dry run', function() {
		before(function() {
			result = input([__filename, '--db', 'development', '--dry-run']);
		});

		it('should have no error', function() {
			chai.expect(result).not.to.have.property('error');
		});

		it('should have no log db option', function() {
			chai.expect(result).not.to.have.deep.property('options.logDb');
		});

		it('should have valid options with db and dummy update', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.contain.subset({
					db: 'development',
					update: 'dummy',
					dryRun: true,
					force: false,
					output: true
				});
		});
	});

	describe('valid patch with db, log db, dry run and parallel', function() {
		before(function() {
			result = input([__filename, '--db', 'development', '--log-db', 'log', '--dry-run', '--parallel', '25']);
		});

		it('should have no error', function() {
			chai.expect(result).not.to.have.property('error');
		});

		it('should have valid options with db, log db, dummy update and parallel', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.contain.subset({
					db: 'development',
					logDb: 'log',
					update: 'dummy',
					parallel: 25,
					dryRun: true,
					force: false,
					output: true
				});
		});
	});

	describe('valid patch with db, log db, and parallel', function() {
		before(function() {
			result = input([__filename, '--db', 'development', '--log-db', 'log', '--parallel', '25']);
		});

		it('should have no error', function() {
			chai.expect(result).not.to.have.property('error');
		});

		it('should have valid options with db, log db, default update and parallel', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.contain.subset({
					db: 'development',
					logDb: 'log',
					update: 'document',
					parallel: 25,
					dryRun: false,
					force: false,
					output: true
				});
		});
	});

	describe('valid patch with db, log db and config path', function() {
		var configPath;

		before(function(done) {
			var config = JSON.stringify({});

			writeFile('config.json', config, function(err, path) {
				configPath = path;
				done(err);
			});
		});

		before(function() {
			result = input([__filename, '--db', 'development', '--log-db', 'log', '--config', configPath]);
		});

		after(function(done) {
			removeFile(done);
		});

		it('should have no error', function() {
			chai.expect(result).not.to.have.property('error');
		});

		it('should have valid options with db, log db and defaults', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.contain.subset({
					db: 'development',
					logDb: 'log',
					update: 'document',
					config: configPath,
					dryRun: false,
					force: false,
					output: true
				});
		});
	});

	describe('config contains valid db, log db and parallel', function() {
		var configPath;

		before(function(done) {
			var config = JSON.stringify({ db: 'production', logDb: 'backup', parallel: 10 });

			writeFile('config.json', config, function(err, path) {
				configPath = path;
				done(err);
			});
		});

		before(function() {
			result = input([__filename, '--config', configPath]);
		});

		after(function(done) {
			removeFile(done);
		});

		it('should have no error', function() {
			chai.expect(result).not.to.have.property('error');
		});

		it('should have valid options with db, log db and defaults', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.contain.subset({
					db: 'production',
					logDb: 'backup',
					update: 'document',
					parallel: 10,
					config: configPath,
					dryRun: false,
					force: false,
					output: true
				});
		});
	});

	describe('valid patch with db, log db with existing dot file', function() {
		var patchPath;

		before(function(done) {
			writeFile('patches/patch.js', '', function(err, path) {
				patchPath = path;
				done(err);
			});
		});

		before(function(done) {
			var config = JSON.stringify({});
			writeFile('.mongopatch', config, done);
		});

		before(function() {
			result = input([patchPath, '--db', 'development', '--log-db', 'log']);
		});

		after(function(done) {
			removeFile(done);
		});

		it('should have no error', function() {
			chai.expect(result).not.to.have.property('error');
		});

		it('should have valid options with db, log db and defaults', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.contain.subset({
					db: 'development',
					logDb: 'log',
					update: 'document',
					dryRun: false,
					force: false,
					output: true
				});
		});
	});

	describe('dot file contains valid db, log db and parallel', function() {
		var patchPath;

		before(function(done) {
			writeFile('patches/patch.js', '', function(err, path) {
				patchPath = path;
				done(err);
			});
		});

		before(function(done) {
			var config = JSON.stringify({ db: 'production', logDb: 'backup', parallel: 10 });
			writeFile('.mongopatch', config, done);
		});

		before(function() {
			result = input([patchPath]);
		});

		after(function(done) {
			removeFile(done);
		});

		it('should have no error', function() {
			chai.expect(result).not.to.have.property('error');
		});

		it('should have valid options with db, log db and defaults', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.contain.subset({
					db: 'production',
					logDb: 'backup',
					update: 'document',
					parallel: 10,
					dryRun: false,
					force: false,
					output: true
				});
		});
	});

	describe('dot file contains db and config file contains log db', function() {
		var patchPath, configPath;

		before(function(done) {
			writeFile('patches/patch.js', '', function(err, path) {
				patchPath = path;
				done(err);
			});
		});

		before(function(done) {
			var config = JSON.stringify({ db: 'production', parallel: 50 });
			writeFile('.mongopatch', config, done);
		});

		before(function(done) {
			var config = JSON.stringify({ logDb: 'backup', update: 'dummy' });

			writeFile('config.json', config, function(err, path) {
				configPath = path;
				done(err);
			});
		});

		before(function() {
			result = input([patchPath, '--config', configPath]);
		});

		after(function(done) {
			removeFile(done);
		});

		it('should have no error', function() {
			chai.expect(result).not.to.have.property('error');
		});

		it('should have valid options with db, log db, update and parallel', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.contain.subset({
					db: 'production',
					logDb: 'backup',
					update: 'dummy',
					parallel: 50,
					config: configPath,
					dryRun: true,
					force: false,
					output: true
				});
		});
	});

	describe('dot file contains output and config contains force and update', function() {
		var patchPath, configPath;

		before(function(done) {
			writeFile('patches/patch.js', '', function(err, path) {
				patchPath = path;
				done(err);
			});
		});

		before(function(done) {
			var config = JSON.stringify({ output: false });
			writeFile('.mongopatch', config, done);
		});

		before(function(done) {
			var config = JSON.stringify({ force: true, update: 'query' });

			writeFile('config.json', config, function(err, path) {
				configPath = path;
				done(err);
			});
		});

		before(function() {
			result = input([patchPath, '--config', configPath, '--db', 'development']);
		});

		after(function(done) {
			removeFile(done);
		});

		it('should have no error', function() {
			chai.expect(result).not.to.have.property('error');
		});

		it('should have valid options with db, force and output set to false', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.contain.subset({
					db: 'development',
					update: 'query',
					config: configPath,
					dryRun: false,
					force: true,
					output: false
				});
		});
	});

	describe.only('valid relative config, setup and patch path', function() {
		var patchPath, configPath, setupPath;

		before(function(done) {
			writeFile('patches/patch.js', '', function(err, path) {
				patchPath = path;
				done(err);
			});
		});

		before(function(done) {
			writeFile('setup/index.js', '', function(err, path) {
				setupPath = path;
				done(err);
			});
		});

		before(function(done) {
			var config = JSON.stringify({});

			writeFile('config.json', config, function(err, path) {
				configPath = path;
				done(err);
			});
		});

		after(function(done) {
			removeFile(done);
		});

		describe('relative patch path', function() {
			before(function() {
				result = input(['./patches/patch', '--db', 'development', '--log-db', 'development'], tmpFile());
			});

			it('should have no error', function() {
				chai.expect(result).not.to.have.property('error');
			});

			it('should contain absolute patch path', function() {
				chai.expect(result)
					.to.have.property('patch', tmpFile('patches/patch'));
			});
		});
	});
});
