var run = require('./_run');

describe('users add place', function() {
	var setup = sinon.spy(function(callback) {
		callback();
	});

	var teardown = sinon.spy(function(stats, callback) {
		callback();
	});

	var fn = function(patch) {
		patch.version(helper.pkg.version);

		patch.setup(setup);

		patch.update('users', function(document, callback) {
			var place = document.location.address + ', ' + document.location.city;
			callback(null, { $set: { place: place } });
		});

		patch.teardown(teardown);
	};

	describe('run patch', function() {
		run.test(fn);
	});

	describe('setup', function() {
		it('should have been called once for each run', function() {
			chai.expect(setup.callCount).to.equal(8);
		});
	});

	describe('teardown', function() {
		it('should have been called once for each run', function() {
			chai.expect(teardown.callCount).to.equal(8);
		});

		describe('first call', function() {
			it('should have been called with stats object and callback function', function() {
				chai.expect(teardown.firstCall.calledWith(sinon.match.object, sinon.match.func)).to.be.true;
			});

			it('should have stats object with data', function() {
				chai.expect(teardown.firstCall.args[0])
					.to.contain.subset({
						total: 3,
						modified: 3,
						diff: { place: { added: 3, removed: 0, updated: 0 } }
					});
			});

			it('should have been called after setup', function() {
				chai.expect(teardown.firstCall.calledAfter(setup.firstCall)).to.be.true;
			});
		});
	});
});
