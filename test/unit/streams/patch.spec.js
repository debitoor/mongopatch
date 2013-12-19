var streams = helper.requireSource('streams');
var mongojs = require('mongojs');

var _users_rename_name_to_username = require('./_users_rename_name_to_username.patch.spec');

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

		it('should contain matched user document', function() {
			chai.expect(patches[0]).to.have.property('document').to.have.property('name', 'user_1');
		});

		it('should contain an user document', function() {
			chai.expect(patches[0].document).to.include.keys(['name', 'associates', 'location']);
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
			var self = this;

			helper.readStream(patchStream, function(err, result) {
				self.patches = patches = result;
				done(err);
			});
		});

		it('should patch three users', function() {
			chai.expect(patches.length).to.equal(3);
		});

		// Test patch for each user
		_users_rename_name_to_username('user_1');
		_users_rename_name_to_username('user_2');
		_users_rename_name_to_username('user_3');
	});

	describe('worker updates whole document', function() {
		before(function(done) {
			var worker = function(user, callback) {
				user.name = 'me';
				callback(null, user);
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

		it('should only contain one user', function() {
			chai.expect(patches.length).to.be.equal(1);
		});

		it('should contain whole user as modifier', function() {
			chai.expect(patches[0]).to.have.property('modifier').to.include.keys(['name', 'associates', 'location']);
		});

		it('should contain modifier with changed name', function() {
			chai.expect(patches[0].modifier).to.have.property('name', 'me');
		});

		it('should not have modified document', function() {
			chai.expect(patches[0]).to.have.property('document').to.have.property('name', 'user_1');
		});
	});

	describe('worker performs async update', function() {
		before(function(done) {
			var worker = function(user, callback) {
				setTimeout(function() {
					callback(null, { $set: { location: { city: 'Esbjerg' } } });
				}, 10);
			};

			var patchStream = streams.patch(
				helper.db.collection('users'),
				worker,
				{ query: { name: 'user_2' } });

			helper.readStream(patchStream, function(err, result) {
				patches = result;
				done(err);
			});
		});

		it('should only contain one user', function() {
			chai.expect(patches.length).to.equal(1);
		});

		it('should contain matched user document', function() {
			chai.expect(patches[0]).to.have.property('document').to.have.property('name', 'user_2');
		});

		it('should contain passed modifier', function() {
			chai.expect(patches[0]).to.have.property('modifier').to.deep.equal({ $set: { location: { city: 'Esbjerg' } } });
		});
	});

	describe('worker calls with an error', function() {
		var err;

		before(function(done) {
			var worker = function(user, callback) {
				callback(new Error('User error'));
			};

			var patchStream = streams.patch(
				helper.db.collection('users'),
				worker,
				{ query: { name: 'user_3' } });

			patchStream.on('error', function(result) {
				err = result;
				done();
			});
		});

		it('should emit an error', function() {
			chai.expect(err).to.be.defined;
		});

		it('should contain patch data', function() {
			chai.expect(err).to.have.property('patch');
		});

		it('should have patch data with user document', function() {
			chai.expect(err.patch).to.have.property('document').to.have.property('name', 'user_3');
		});
	});
});
