var streams = helper.requireSource('streams');
var mongojs = require('mongojs');

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

			var patchStream = streams.patch(
				helper.db.collection('users'),
				worker,
				{ query: { name: 'user_1' } });

			helper.readStream(patchStream, function(err, result) {
				patches = result;
				done(err);
			});
		});

		it('should only patch one user', function() {
			chai.expect(patches.length).to.equal(1);
		});

		it('should contain passed modifier', function() {
			chai.expect(patches[0]).to.have.property('modifier').to.deep.equal({ $set: { associates: ['user_2'] } });
		});

		it('should contain matched user document', function() {
			chai.expect(patches[0]).to.have.property('document').to.have.property('name', 'user_1');
		});

		it('should contain passed query', function() {
			chai.expect(patches[0]).to.have.property('query').to.deep.equal({ name: 'user_1' });
		});

		it('should contain mongojs collection object', function() {
			chai.expect(patches[0]).to.have.property('collection').to.be.an.instanceof(mongojs.Collection);
			chai.expect(patches[0].collection.toString()).to.equal(helper.db.toString() + '.users');
		});
	});
});
