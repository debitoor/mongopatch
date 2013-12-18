var helper = require('../helper');
var streams = helper.requireSource('streams');

describe('patchStream', function() {
	var patches;

	beforeEach(function(done) {
		helper.loadFixture('users', done);
	});

	describe('create patch for single user', function() {
		beforeEach(function(done) {
			var worker = function(user, callback) {
				callback(null, { $set: { associates: ['user_2'] } });
			};

			var patchStream = streams.patch(helper.db.collection('users'), worker, { query: { name: 'user_1' } });

			helper.readStream(patchStream, function(err, result) {
				patches = result;
				done(err);
			});
		});

		it('should only patch one user', function() {
			chai.expect(patches.length).to.equal(1);
		});
	});
});
