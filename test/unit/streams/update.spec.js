var mongojs = require('mongojs');
var streams = helper.requireSource('streams');

var _users_rename_name_to_username = require('./_users_rename_name_to_username.update.spec');

describe('streams.update', function() {
	var patches, users;

	describe('apply update for single user', function() {
		before(function(done) {
			helper.loadFixture('users', function(err, result) {
				users = result;
				done(err);
			});
		});

		before(function(done) {
			var updateStream = streams.update();

			helper.readStream(updateStream, function(err, result) {
				patches = result;
				done(err);
			});

			updateStream.write({
				document: users[0],
				modifier: { $set: { associates: ['user_2'] } },
				collection: helper.db.collection('users'),
				query: { name: 'user_1' }
			});

			updateStream.end();
		});

		it('should contain only one patch', function() {
			chai.expect(patches.length).to.equal(1);
		});

		it('should contain updated document', function() {
			chai.expect(patches[0]).to.have.property('updatedDocument').to.contain.subset({
				name: 'user_1',
				associates: ['user_2'],
				location: {
					city: 'Copenhagen',
					address: 'Wildersgade'
				}
			});
		});

		it('should contain original document', function() {
			chai.expect(patches[0]).to.have.property('document').to.contain.subset({
				name: 'user_1',
				associates: [],
				location: {
					city: 'Copenhagen',
					address: 'Wildersgade'
				}
			});
		});

		it('should contain modifier', function() {
			chai.expect(patches[0]).to.have.property('modifier').to.deep.equal({ $set: { associates: ['user_2'] } });
		});

		it('should contain query', function() {
			chai.expect(patches[0]).to.have.property('query').to.deep.equal({ name: 'user_1' });
		});

		it('should contain collection being a mongojs object', function() {
			chai.expect(patches[0]).to.have.property('collection').to.be.an.instanceof(mongojs.Collection);
		});

		it('should contain collection having users as name', function() {
			chai.expect(patches[0].collection.toString()).to.equal(helper.db.toString() + '.users');
		});

		it('should contain document diff', function() {
			chai.expect(patches[0])
				.to.have.property('diff')
				.to.have.property('document').to.deep.equal({ associates: ['added'] });
		});

		it('should contain accumulated diff', function() {
			chai.expect(patches[0])
				.to.have.property('diff')
				.to.have.property('accumulated').to.deep.equal({ 'associates.[*]': { added: 1, removed: 0, updated: 0 } });
		});
	});

	describe('apply update for multiple users', function() {
		before(function(done) {
			helper.loadFixture('users', function(err, result) {
				users = result;
				done(err);
			});
		});

		before(function(done) {
			var updateStream = streams.update();

			var query = {};
			var modifier = { $rename: { name: 'username' } };
			var collection = helper.db.collection('users');

			var self = this;

			helper.readStream(updateStream, function(err, result) {
				self.patches = patches = result;
				done(err);
			});

			updateStream.write({
				document: users[0],
				modifier: modifier,
				collection: collection,
				query: query
			});

			updateStream.write({
				document: users[1],
				modifier: modifier,
				collection: collection,
				query: query
			});

			updateStream.write({
				document: users[2],
				modifier: modifier,
				collection: collection,
				query: query
			});

			updateStream.end();
		});

		it('should update three users', function() {
			chai.expect(patches.length).to.equal(3);
		});

		it('should preserve document order', function() {
			var names = patches.map(function(p) {
				return p.document && p.document.name;
			});

			chai.expect(names).to.deep.equal(['user_1', 'user_2', 'user_3']);
		});

		_users_rename_name_to_username(0, 'user_1');
		_users_rename_name_to_username(1, 'user_2');
		_users_rename_name_to_username(2, 'user_3');
	});

	describe('after callback applied', function() {
		var afterCallback;

		before(function(done) {
			helper.loadFixture('users', function(err, result) {
				users = result;
				done(err);
			});
		});

		before(function(done) {
			afterCallback = sinon.spy(function(update, callback) {
				callback();
			});

			var updateStream = streams.update({ afterCallback: afterCallback });

			helper.readStream(updateStream, function(err, result) {
				patches = result;
				done(err);
			});

			updateStream.write({
				document: users[0],
				modifier: { $set: { location: { city: 'Esbjerg' } } },
				collection: helper.db.collection('users'),
				query: { name: 'user_1' }
			});

			updateStream.end();
		});

		it('should only patch one user', function() {
			chai.expect(patches.length).to.equal(1);
		});

		it('should have been called once', function() {
			chai.expect(afterCallback.calledOnce).to.be.true;
		});

		it('should have been called with options and callback', function() {
			chai.expect(afterCallback.firstCall.calledWith(sinon.match.object, sinon.match.func)).to.be.true;
		});

		it('should have been called with modified', function() {
			chai.expect(afterCallback.firstCall.args[0])
				.to.have.property('modified')
				.to.be.true;
		});

		it('should have been called with original document', function() {
			chai.expect(afterCallback.firstCall.args[0])
				.to.have.property('before')
				.to.contain.subset({
					name: 'user_1',
					associates: [],
					location: {
						city: 'Copenhagen',
						address: 'Wildersgade'
					}
				});
		});

		it('should have been called with original document', function() {
			chai.expect(afterCallback.firstCall.args[0])
				.to.have.property('after')
				.to.contain.subset({
					name: 'user_1',
					associates: [],
					location: {
						city: 'Esbjerg'
					}
				});
		});

		it('should have been called with diff', function() {
			chai.expect(afterCallback.firstCall.args[0])
				.to.have.property('diff')
				.to.deep.equal({
					location: {
						city: 'updated',
						address: 'removed'
					}
				});
		});
	});
});
