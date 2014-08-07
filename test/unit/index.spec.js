var index = helper.requireSource('index');

describe('index', function() {
	var error;

	var options = function() {
		return { db: helper.db.toString(), update: 'document' };
	};

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
});
