var fs = require('fs');
var os = require('os');
var path = require('path');
var util = require('util');

var mkdirp = require('mkdirp');
var rimraf = require('rimraf');

var input = helper.requireSource('cli/in');

var resolveFile = function(name) {
	return require.resolve(tmpFile(name));
};

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

		it('should have valid options', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.deep.equal({
					db: 'development',
					logDb: 'log',
					update: 'document',
					dryRun: false,
					force: false,
					output: true,
					version: false
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

		it('should have valid options', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.deep.equal({
					db: 'development',
					update: 'document',
					dryRun: false,
					force: true,
					output: true,
					version: false
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

		it('should have valid options', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.deep.equal({
					db: 'development',
					logDb: 'log',
					update: 'document',
					parallel: 100,
					dryRun: false,
					force: false,
					output: true,
					version: false
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

		it('should have valid options', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.deep.equal({
					db: 'development',
					logDb: 'log',
					update: 'document',
					parallel: 10,
					dryRun: false,
					force: false,
					output: true,
					version: false
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

		it('should have valid options', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.deep.equal({
					db: 'development',
					logDb: 'log',
					update: 'query',
					dryRun: false,
					force: false,
					output: true,
					version: false
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

		it('should have valid options with db and update', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.deep.equal({
					db: 'development',
					update: 'dummy',
					dryRun: true,
					force: false,
					output: true,
					version: false
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

		it('should have valid options', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.deep.equal({
					db: 'development',
					logDb: 'log',
					update: 'dummy',
					dryRun: true,
					force: false,
					output: true,
					version: false
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

		it('should have valid options', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.deep.equal({
					db: 'development',
					update: 'dummy',
					dryRun: true,
					force: false,
					output: true,
					version: false
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

		it('should have valid options', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.deep.equal({
					db: 'development',
					logDb: 'log',
					update: 'dummy',
					parallel: 25,
					dryRun: true,
					force: false,
					output: true,
					version: false
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

		it('should have valid options', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.deep.equal({
					db: 'development',
					logDb: 'log',
					update: 'document',
					parallel: 25,
					dryRun: false,
					force: false,
					output: true,
					version: false
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

		it('should have valid options', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.deep.equal({
					db: 'development',
					logDb: 'log',
					update: 'document',
					config: resolveFile('./config.json'),
					dryRun: false,
					force: false,
					output: true,
					version: false
				});
		});
	});

	describe('valid patch with db and setup path', function() {
		var setupPath;

		before(function(done) {
			writeFile('setup.js', '', function(err, path) {
				setupPath = path;
				done(err);
			});
		});

		before(function() {
			result = input([__filename, '--db', 'development', '--log-db', 'log', '--setup', setupPath]);
		});

		after(function(done) {
			removeFile(done);
		});

		it('should have no error', function() {
			chai.expect(result).not.to.have.property('error');
		});

		it('should have valid options', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.deep.equal({
					db: 'development',
					logDb: 'log',
					update: 'document',
					setup: resolveFile('setup.js'),
					dryRun: false,
					force: false,
					output: true,
					version: false
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

		it('should have valid options', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.deep.equal({
					db: 'production',
					logDb: 'backup',
					update: 'document',
					parallel: 10,
					config: resolveFile('./config.json'),
					dryRun: false,
					force: false,
					output: true,
					version: false
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
			writeFile('.mongopatch.json', config, done);
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

		it('should have valid options', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.deep.equal({
					db: 'development',
					logDb: 'log',
					update: 'document',
					dryRun: false,
					force: false,
					output: true,
					version: false
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
			writeFile('.mongopatch.json', config, done);
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

		it('should have valid options', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.deep.equal({
					db: 'production',
					logDb: 'backup',
					update: 'document',
					parallel: 10,
					dryRun: false,
					force: false,
					output: true,
					version: false
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
			writeFile('.mongopatch.json', config, done);
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

		it('should have valid options', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.deep.equal({
					db: 'production',
					logDb: 'backup',
					update: 'dummy',
					parallel: 50,
					config: resolveFile('./config.json'),
					dryRun: true,
					force: false,
					output: true,
					version: false
				});
		});
	});

	describe('config file overwrites dot file log db', function() {
		var patchPath, configPath;

		before(function(done) {
			writeFile('patches/patch.js', '', function(err, path) {
				patchPath = path;
				done(err);
			});
		});

		before(function(done) {
			var config = JSON.stringify({ logDb: 'log', output: false });
			writeFile('.mongopatch.json', config, done);
		});

		before(function(done) {
			var config = JSON.stringify({ logDb: 'backup', force: true });

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

		it('should have valid options', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.deep.equal({
					db: 'development',
					logDb: 'backup',
					update: 'document',
					config: resolveFile('./config.json'),
					dryRun: false,
					force: true,
					output: false,
					version: false
				});
		});
	});

	describe('relative config js file with db', function() {
		var patchPath;

		before(function(done) {
			writeFile('patches/patch.js', '', function(err, path) {
				patchPath = path;
				done(err);
			});
		});

		before(function(done) {
			var config = util.format('module.exports = %s;', JSON.stringify({ db: 'development' }));
			writeFile('.mongopatch.js', config, done);
		});

		before(function() {
			result = input([patchPath, '--log-db', 'log'], tmpFile());
		});

		after(function(done) {
			removeFile(done);
		});

		it('should have no error', function() {
			chai.expect(result).not.to.have.property('error');
		});

		it('should have valid options', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.deep.equal({
					db: 'development',
					logDb: 'log',
					update: 'document',
					dryRun: false,
					force: false,
					output: true,
					version: false
				});
		});
	});

	describe('dot js file with db', function() {
		var patchPath;

		before(function(done) {
			writeFile('patches/patch.js', '', function(err, path) {
				patchPath = path;
				done(err);
			});
		});

		before(function(done) {
			var config = util.format('module.exports = %s;', JSON.stringify({ db: 'development' }));
			writeFile('config.js', config, done);
		});

		before(function() {
			result = input([patchPath, '--config', './config.js', '--log-db', 'log'], tmpFile());
		});

		after(function(done) {
			removeFile(done);
		});

		it('should have no error', function() {
			chai.expect(result).not.to.have.property('error');
		});

		it('should have valid options', function() {
			chai.expect(result)
				.to.have.property('options')
				.to.deep.equal({
					db: 'development',
					logDb: 'log',
					update: 'document',
					config: resolveFile('./config.js'),
					dryRun: false,
					force: false,
					output: true,
					version: false
				});
		});
	});

	describe('valid relative config, setup and patch path', function() {
		var patchPath;

		before(function(done) {
			writeFile('patches/patch.js', '', function(err, path) {
				patchPath = path;
				done(err);
			});
		});

		before(function(done) {
			writeFile('setup/index.js', '', done);
		});

		before(function(done) {
			var config = JSON.stringify({});
			writeFile('config.json', config, done);
		});

		after(function(done) {
			removeFile(done);
		});

		describe('relative patch path', function() {
			before(function() {
				result = input(['./patches/patch', '--db', 'development', '--log-db', 'log'], tmpFile());
			});

			it('should have no error', function() {
				chai.expect(result).not.to.have.property('error');
			});

			it('should contain absolute patch path', function() {
				chai.expect(result)
					.to.have.property('patch', resolveFile('patches/patch.js'));
			});
		});

		describe('relative setup patch', function() {
			before(function() {
				result = input([patchPath, '--db', 'development', '--log-db', 'log', '--setup', './setup/index.js'], tmpFile());
			});

			it('should have no error', function() {
				chai.expect(result).not.to.have.property('error');
			});

			it('should have valid options', function() {
				chai.expect(result)
					.to.have.property('options')
					.to.deep.equal({
						db: 'development',
						logDb: 'log',
						update: 'document',
						setup: resolveFile('setup/index.js'),
						dryRun: false,
						force: false,
						output: true,
						version: false
					});
			});
		});

		describe('relative config', function() {
			before(function() {
				result = input([patchPath, '--db', 'development', '--log-db', 'log', '--config', './config.json'], tmpFile());
			});

			it('should have no error', function() {
				chai.expect(result).not.to.have.property('error');
			});

			it('should have valid options', function() {
				chai.expect(result)
					.to.have.property('options')
					.to.deep.equal({
						db: 'development',
						logDb: 'log',
						update: 'document',
						config: resolveFile('./config.json'),
						dryRun: false,
						force: false,
						output: true,
						version: false
					});
			});
		});

		describe('all relative paths', function() {
			before(function() {
				result = input(['./patches/patch', '--db', 'development', '--log-db', 'log', '--config', './config.json', '--setup', './setup'], tmpFile());
			});

			it('should have no error', function() {
				chai.expect(result).not.to.have.property('error');
			});

			it('should contain absolute patch path', function() {
				chai.expect(result)
					.to.have.property('patch', resolveFile('patches/patch.js'));
			});

			it('should have valid options', function() {
				chai.expect(result)
					.to.have.property('options')
					.to.deep.equal({
						db: 'development',
						logDb: 'log',
						update: 'document',
						config: resolveFile('./config.json'),
						setup: resolveFile('./setup/index.js'),
						dryRun: false,
						force: false,
						output: true,
						version: false
					});
			});
		});
	});
});
