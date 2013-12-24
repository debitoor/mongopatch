var mongojs = require('mongojs');

module.exports = function(createStream) {
	describe('update stream', function() {
		var patches, users;

		describe('apply update for single user', function() {
			before(function(done) {
				helper.loadFixture('users', function(err, result) {
					users = result;
					done(err);
				});
			});

			before(function(done) {
				var updateStream = createStream();

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

			it('should contain modified', function() {
				chai.expect(patches[0]).to.have.property('modified').to.be.true;
			});

			it('should contain diff', function() {
				chai.expect(patches[0])
					.to.have.property('diff')
					.to.deep.equal({ associates: ['added'] });
			});
		});

		describe('apply update for all users', function() {
			before(function(done) {
				helper.loadFixture('users', function(err, result) {
					users = result;
					done(err);
				});
			});

			before(function(done) {
				var updateStream = createStream();

				var query = {};
				var modifier = { $rename: { name: 'username' } };
				var collection = helper.db.collection('users');

				helper.readStream(updateStream, function(err, result) {
					patches = result;
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

			describe('update for user_1', function() {
				var patch;

				before(function() {
					patch = patches[0];
				});

				it('should contain passed modifier', function() {
					chai.expect(patch).to.have.property('modifier').to.deep.equal({ $rename: { name: 'username' } });
				});

				it('should contain updated document', function() {
					chai.expect(patch).to.have.property('updatedDocument').to.have.property('username', 'user_1');
				});

				it('should contain original document', function() {
					chai.expect(patch).to.have.property('document').to.have.property('name', 'user_1');
				});

				it('should contain query', function() {
					chai.expect(patch).to.have.property('query').to.deep.equal({});
				});

				it('should contain collection being a mongojs object', function() {
					chai.expect(patch).to.have.property('collection').to.be.an.instanceof(mongojs.Collection);
				});

				it('should contain modified', function() {
					chai.expect(patch).to.have.property('modified').to.be.true;
				});

				it('should contain diff', function() {
					chai.expect(patch)
						.to.have.property('diff')
						.to.deep.equal({ name: 'removed', username: 'added' });
				});
			});

			describe('update for user_2', function() {
				var patch;

				before(function() {
					patch = patches[1];
				});

				it('should contain passed modifier', function() {
					chai.expect(patch).to.have.property('modifier').to.deep.equal({ $rename: { name: 'username' } });
				});

				it('should contain updated document', function() {
					chai.expect(patch).to.have.property('updatedDocument').to.have.property('username', 'user_2');
				});

				it('should contain original document', function() {
					chai.expect(patch).to.have.property('document').to.have.property('name', 'user_2');
				});

				it('should contain query', function() {
					chai.expect(patch).to.have.property('query').to.deep.equal({});
				});

				it('should contain collection being a mongojs object', function() {
					chai.expect(patch).to.have.property('collection').to.be.an.instanceof(mongojs.Collection);
				});

				it('should contain modified', function() {
					chai.expect(patch).to.have.property('modified').to.be.true;
				});

				it('should contain diff', function() {
					chai.expect(patch)
						.to.have.property('diff')
						.to.deep.equal({ name: 'removed', username: 'added' });
				});
			});

			describe('update for user_3', function() {
				var patch;

				before(function() {
					patch = patches[2];
				});

				it('should contain passed modifier', function() {
					chai.expect(patch).to.have.property('modifier').to.deep.equal({ $rename: { name: 'username' } });
				});

				it('should contain updated document', function() {
					chai.expect(patch).to.have.property('updatedDocument').to.have.property('username', 'user_3');
				});

				it('should contain original document', function() {
					chai.expect(patch).to.have.property('document').to.have.property('name', 'user_3');
				});

				it('should contain query', function() {
					chai.expect(patch).to.have.property('query').to.deep.equal({});
				});

				it('should contain collection being a mongojs object', function() {
					chai.expect(patch).to.have.property('collection').to.be.an.instanceof(mongojs.Collection);
				});

				it('should contain modified', function() {
					chai.expect(patch).to.have.property('modified').to.be.true;
				});

				it('should contain diff', function() {
					chai.expect(patch)
						.to.have.property('diff')
						.to.deep.equal({ name: 'removed', username: 'added' });
				});
			});
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

				var updateStream = createStream({ afterCallback: afterCallback });

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

		describe('after callback modifies update options', function() {
			var afterCallback;

			before(function(done) {
				helper.loadFixture('users', function(err, result) {
					users = result;
					done(err);
				});
			});

			before(function(done) {
				afterCallback = sinon.spy(function(update, callback) {
					update.after.name = 'different_name';
					update.before.associates = [];

					callback();
				});

				var updateStream = createStream({ afterCallback: afterCallback });

				helper.readStream(updateStream, function(err, result) {
					patches = result;
					done(err);
				});

				updateStream.write({
					document: users[1],
					modifier: { $pull: { associates: 'user_1' } },
					collection: helper.db.collection('users'),
					query: { name: 'user_2' }
				});

				updateStream.end();
			});

			it('should only patch one user', function() {
				chai.expect(patches.length).to.equal(1);
			});

			it('should have been called once', function() {
				chai.expect(afterCallback.calledOnce).to.be.true;
			});

			it('should have no effect on original document in patch', function() {
				chai.expect(patches[0])
					.to.have.property('document')
					.to.contain.subset({
						name: 'user_2',
						associates: ['user_1', 'user_3']
					});
			});

			it('should have no effect on updated document in patch', function() {
				chai.expect(patches[0])
					.to.have.property('updatedDocument')
					.to.contain.subset({
						name: 'user_2',
						associates: ['user_3']
					});
			});
		});

		describe('after callback returns an error', function() {
			var afterCallback, err;

			before(function(done) {
				helper.loadFixture('users', function(err, result) {
					users = result;
					done(err);
				});
			});

			before(function(done) {
				afterCallback = sinon.spy(function(update, callback) {
					callback(new Error('Invalid update'));
				});

				var updateStream = createStream({ afterCallback: afterCallback });

				updateStream.on('error', function(result) {
					err = result;
					done();
				});

				updateStream.write({
					document: users[1],
					modifier: { $pull: { associates: 'user_1' } },
					collection: helper.db.collection('users'),
					query: { name: 'user_2' }
				});

				updateStream.end();
			});

			it('should emit an error', function() {
				chai.expect(err).to.be.defined;
			});

			it('should contain patch data', function() {
				chai.expect(err)
					.to.have.property('patch')
					.to.contain.keys(['document', 'updatedDocument', 'collection', 'diff', 'query', 'modifier']);
			});
		});
	});
};
