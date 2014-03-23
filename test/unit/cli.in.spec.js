var input = helper.requireSource('cli/in');

describe('cli.in', function() {
	var result;

	describe('empty arguments', function() {
		before(function() {
			result = input([]);
		});

		it('should have patch option error', function() {
			chai.expect(result)
				.to.have.property('error')
				.to.have.property('option', 'patch');
		});
	});

	describe('invalid patch path', function() {
		before(function() {
			result = input(['/path/does/not/exists']);
		});

		it('should have patch option error', function() {
			chai.expect(result)
				.to.have.property('error')
				.to.have.property('option', 'patch');
		});
	});

	describe('valid patch path with unknown option', function() {
		before(function() {
			result = input([__filename, '--wet-run']);
		});

		it('should have unknown option error', function() {
			chai.expect(result)
				.to.have.property('error')
				.to.have.property('option', 'wetRun');
		});
	});

	describe('valid patch path with no db', function() {
		before(function() {
			result = input([__filename]);
		});

		it('should have db option error', function() {
			chai.expect(result)
				.to.have.property('error')
				.to.have.property('option', 'db');
		});
	});

	describe('valid patch path with db and no log db', function() {
		before(function() {
			result = input([__filename, '--db', 'development']);
		});

		it('should have log db option error', function() {
			chai.expect(result)
				.to.have.property('error')
				.to.have.property('option', 'logDb');
		});
	});

	describe('valid patch path with db and empty update', function() {
		before(function() {
			result = input([__filename, '--db', 'development', '--update']);
		});

		it('should have update option error', function() {
			chai.expect(result)
				.to.have.property('error')
				.to.have.property('option', 'update');
		});
	});

	describe('valid patch path with db and invalid update', function() {
		before(function() {
			result = input([__filename, '--db', 'development', '--update', 'nothing']);
		});

		it('should have update option error', function() {
			chai.expect(result)
				.to.have.property('error')
				.to.have.property('option', 'update');
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
					dryRun: false
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
					force: true,
					dryRun: false
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
					dryRun: false
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
					dryRun: false
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
					dryRun: false
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
					dryRun: true
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
					dryRun: true
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
					dryRun: true
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
					dryRun: true,
					parallel: 25
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
					dryRun: false,
					parallel: 25
				});
		});
	});
});
