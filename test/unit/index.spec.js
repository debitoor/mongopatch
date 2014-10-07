var index = helper.requireSource('index');

describe('index', function() {
	var error;

	var options = function() {
		return { db: helper.db.toString(), update: 'document' };
	};

	before(helper.loadAllFixtures);

	describe('no version', function() {
		var fn = function(patch) {
			patch.update('users', function(document, callback) {
				callback();
			});
		};

		before(function(done) {
			var stream = index(fn, options());

			helper.readStream(stream, function(err) {
				error = err;
				done();
			});
		});

		it('should have returned version mismatch error', function() {
			chai.expect(error)
				.to.have.property('message')
				.to.contain('does not match current system version');
		});
	});

	describe('invalid version', function() {
		var fn = function(patch) {
			patch.version('0.0.0');

			patch.update('users', function(document, callback) {
				callback();
			});
		};

		before(function(done) {
			var stream = index(fn, options());

			helper.readStream(stream, function(err) {
				error = err;
				done();
			});
		});

		it('should have returned version mismatch error', function() {
			chai.expect(error)
				.to.have.property('message')
				.to.contain('does not match current system version');
		});
	});

	describe('no update function', function() {
		var fn = function(patch) {
			patch.version(helper.pkg.version);
		};

		before(function(done) {
			var stream = index(fn, options());

			helper.readStream(stream, function(err) {
				error = err;
				done();
			});
		});

		it('should have returned update error', function() {
			chai.expect(error)
				.to.have.property('message')
				.to.contain('Update missing');
		});
	});

	describe('invalid collection name', function() {
		var fn = function(patch) {
			patch.version(helper.pkg.version);

			patch.update('users_invalid', function(document, callback) {
				callback();
			});
		};

		before(function(done) {
			var stream = index(fn, options());

			helper.readStream(stream, function(err) {
				error = err;
				done();
			});
		});

		it('should have returned collection error', function() {
			chai.expect(error)
				.to.have.property('message')
				.to.contain('does not seem to exist');
		});
	});

	describe('mongojs database object as log database', function() {
		var patches;
		var fn = function(patch) {
			patch.version(helper.pkg.version);

			patch.update('users', function(document, callback) {
				callback(null, { $set: { name: document.name } });
			});
		};

		before(function(done) {
			var stream = index(fn, {
				db: helper.db,
				update: 'document'
			});

			helper.readStream(stream, function(err, result) {
				patches = result;
				done(err);
			});
		});

		it('should have patched all users', function() {
			chai.expect(patches.length).to.equal(3);
		});

		describe('database should still be open', function() {
			before(function(done) {
				helper.db.collection('users').findOne({ name: 'user_1' }, function(result) {
					error = result;
					done();
				});
			});

			it('should have returned no error', function() {
				chai.expect(error).not.to.be.ok;
			});
		});
	});

	describe('mongojs collection object as log collection', function() {
		var patches, log, logCollection;

		var fn = function(patch) {
			patch.version(helper.pkg.version);

			patch.update('users', function(document, callback) {
				callback(null, { $set: { name: document.name } });
			});
		};

		before(function(done) {
			logCollection = helper.logDb.collection('my_custom_log_collection');
			logCollection.remove(done);
		});

		before(function(done) {
			var stream = index(fn, {
				db: helper.db,
				logCollection: logCollection,
				update: 'document'
			});

			helper.readStream(stream, function(err, result) {
				patches = result;
				done(err);
			});
		});

		before(function(done) {
			logCollection.find({}, function(err, result) {
				log = result;
				done(err);
			});
		});

		it('should have patched all users', function() {
			chai.expect(patches.length).to.equal(3);
		});

		it('should have logged all users', function() {
			chai.expect(log.length).to.equal(3);
		});
	});

	describe('log collection as string', function() {
		var patches, log, logCollection;

		var fn = function(patch) {
			patch.version(helper.pkg.version);

			patch.update('users', function(document, callback) {
				callback(null, { $set: { name: document.name } });
			});
		};

		before(function(done) {
			logCollection = helper.logDb.collection('my_custom_log_collection');
			logCollection.remove(done);
		});

		before(function(done) {
			var stream = index(fn, {
				db: helper.db,
				logDb: helper.logDb.toString(),
				logCollection: 'my_custom_log_collection',
				update: 'document'
			});

			helper.readStream(stream, function(err, result) {
				patches = result;
				done(err);
			});
		});

		before(function(done) {
			logCollection.find({}, function(err, result) {
				log = result;
				done(err);
			});
		});

		it('should have patched all users', function() {
			chai.expect(patches.length).to.equal(3);
		});

		it('should have logged all users', function() {
			chai.expect(log.length).to.equal(3);
		});
	});
});
