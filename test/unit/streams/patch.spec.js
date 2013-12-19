var streams = helper.requireSource('streams');
var mongojs = require('mongojs');

describe('patchStream', function() {
	var patches;

	beforeEach(function(done) {
		helper.loadFixture('users', done);
	});

	describe('create patch for single user', function() {
		before(function(done) {
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

		it('should contain an user document', function() {
			chai.expect(patches[0].document).to.include.keys(['name', 'associates', 'location']);
		});

		it('should contain matched user document', function() {
			chai.expect(patches[0]).to.have.property('document').to.have.property('name', 'user_1');
		});

		it('should contain passed query', function() {
			chai.expect(patches[0]).to.have.property('query').to.deep.equal({ name: 'user_1' });
		});

		it('should contain collection being a mongojs object', function() {
			chai.expect(patches[0]).to.have.property('collection').to.be.an.instanceof(mongojs.Collection);
		});

		it('should contain collection having users as name', function() {
			chai.expect(patches[0].collection.toString()).to.equal(helper.db.toString() + '.users');
		});
	});

	describe('create patch for all users', function() {
		before(function(done) {
			var worker = function(user, callback) {
				callback(null, { $rename: { 'name': 'username' } });
			};

			var patchStream = streams.patch(helper.db.collection('users'), worker);

			helper.readStream(patchStream, function(err, result) {
				patches = result;
				done(err);
			});
		});

		it('should patch three users', function() {
			chai.expect(patches.length).to.equal(3);
		});

		//it('should have patch for user_1', function() {
		//	chai.expect(patches);
		//});
	});
});
