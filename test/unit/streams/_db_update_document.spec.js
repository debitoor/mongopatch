module.exports = function(createStream) {
	var users, usersCollection, userDocument;

	describe('externally modified property fails query', function() {
		var worker, patches;

		before(function(done) {
			helper.loadFixture('users', function(err, result) {
				users = result;
				done(err);
			});
		});

		before(function(done) {
			usersCollection = helper.db.collection('users');

			var modifier = function() {
				return { $set: { 'location.city': 'London' } };
			};

			worker = sinon.spy(function(document, callback) {
				callback(null, modifier());
			});

			var delayedUsersCollection = helper.delayCollection(usersCollection);

			delayedUsersCollection.onfindandmodify = function(callback) {
				usersCollection.update({ name: 'user_2' }, modifier(), function(err) {
					if(err) {
						return done(err);
					}

					callback();
				});
			};

			var updateStream = createStream(worker);

			helper.readStream(updateStream, function(err, result) {
				patches = result;
				done(err);
			});

			updateStream.write({
				before: users[1],
				modifier: modifier(),
				collection: delayedUsersCollection,
				query: { 'location.city': { $ne: 'London' } }
			});

			updateStream.end();
		});

		before(function(done) {
			usersCollection.findOne({ name: 'user_2' }, function(err, result) {
				userDocument = result;
				done(err);
			});
		});

		it('should only patch one user', function() {
			chai.expect(patches.length).to.equal(1);
		});

		it('should have patch with before document', function() {
			chai.expect(patches[0])
				.to.have.property('before')
				.to.contain.subset({
					name: 'user_2',
					associates: ['user_1', 'user_3'],
					location: {
						city: 'Aarhus',
						address: 'Niels Borhs Vej'
					}
				});
		});

		it('should not have modified document', function() {
			chai.expect(patches[0]).to.have.property('modified', false);
		});

		it('should have skipped document', function() {
			chai.expect(patches[0]).to.have.property('skipped', true);
		});

		it('should update externally changed document', function() {
			chai.expect(userDocument)
				.to.contain.subset({
					name: 'user_2',
					associates: ['user_1', 'user_3'],
					location: {
						city: 'London',
						address: 'Niels Borhs Vej'
					}
				});
		});

		it('should not have called worker', function() {
			chai.expect(worker.callCount).to.equal(0);
		});
	});

	describe('externally added property fails query', function() {
		var worker, patches;

		before(function(done) {
			helper.loadFixture('users', function(err, result) {
				users = result;
				done(err);
			});
		});

		before(function(done) {
			usersCollection = helper.db.collection('users');

			var modifier = function() {
				return { $set: { createdAt: new Date() } };
			};

			worker = sinon.spy(function(document, callback) {
				callback(null, modifier());
			});

			var delayedUsersCollection = helper.delayCollection(usersCollection);

			delayedUsersCollection.onfindandmodify = function(callback) {
				usersCollection.update({ name: 'user_1' }, modifier(), function(err) {
					if(err) {
						return done(err);
					}

					callback();
				});
			};

			var updateStream = createStream(worker);

			helper.readStream(updateStream, function(err, result) {
				patches = result;
				done(err);
			});

			updateStream.write({
				before: users[0],
				modifier: modifier(),
				collection: delayedUsersCollection,
				query: { createdAt: { $exists: false } }
			});

			updateStream.end();
		});

		before(function(done) {
			usersCollection.findOne({ name: 'user_1' }, function(err, result) {
				userDocument = result;
				done(err);
			});
		});

		it('should only patch one user', function() {
			chai.expect(patches.length).to.equal(1);
		});

		it('should have patch with before document', function() {
			chai.expect(patches[0])
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

		it('should not have modified document', function() {
			chai.expect(patches[0]).to.have.property('modified', false);
		});

		it('should have skipped document', function() {
			chai.expect(patches[0]).to.have.property('skipped', true);
		});

		it('should update externally changed document', function() {
			chai.expect(userDocument)
				.to.contain.subset({
					name: 'user_1',
					associates: [],
					location: {
						city: 'Copenhagen',
						address: 'Wildersgade'
					}
				})
				.to.have.property('createdAt');
		});

		it('should not have called worker', function() {
			chai.expect(worker.callCount).to.equal(0);
		});
	});

	describe('externally modified property satisfies query', function() {
		var worker, patches;

		before(function(done) {
			helper.loadFixture('users', function(err, result) {
				users = result;
				done(err);
			});
		});

		before(function(done) {
			usersCollection = helper.db.collection('users');

			worker = sinon.spy(function(document, callback) {
				callback(null, { $set: { 'location.address': 'Silkeborg Vej' } });
			});

			var delayedUsersCollection = helper.delayCollection(usersCollection);

			delayedUsersCollection.onfindandmodify = function(callback) {
				// Unrelated property (location.city) modified externally
				usersCollection.update({ name: 'user_1' }, { $set: { 'location.city': 'London' } }, function(err) {
					if(err) {
						return done(err);
					}

					// Do not perform external update when called again
					delayedUsersCollection.onfindandmodify = null;
					callback();
				});
			};

			var updateStream = createStream(worker);

			helper.readStream(updateStream, function(err, result) {
				patches = result;
				done(err);
			});

			updateStream.write({
				before: users[0],
				modifier: { $set: { 'location.address': 'Silkeborg Vej' } },
				collection: delayedUsersCollection,
				query: { name: 'user_1' }
			});

			updateStream.end();
		});

		before(function(done) {
			usersCollection.findOne({ name: 'user_1' }, function(err, result) {
				userDocument = result;
				done(err);
			});
		});

		it('should only patch one user', function() {
			chai.expect(patches.length).to.equal(1);
		});

		it('should have patch with changed before document', function() {
			chai.expect(patches[0])
				.to.have.property('before')
				.to.contain.subset({
					name: 'user_1',
					associates: [],
					location: {
						city: 'London',
						address: 'Wildersgade'
					}
				});
		});

		it('should have modified document', function() {
			chai.expect(patches[0]).to.have.property('modified', true);
		});

		it('should not have skipped document', function() {
			chai.expect(patches[0]).to.have.property('skipped', false);
		});

		it('should update externally changed document', function() {
			chai.expect(userDocument)
				.to.contain.subset({
					name: 'user_1',
					associates: [],
					location: {
						city: 'London',
						address: 'Silkeborg Vej'
					}
				});
		});

		it('should not have called worker', function() {
			chai.expect(worker.callCount).to.equal(1);
		});

		it('should have been called with document and callback', function() {
			chai.expect(worker.firstCall.calledWith(sinon.match.object, sinon.match.func)).to.be.true;
		});

		it('should have been called with changed document as first argument', function() {
			chai.expect(worker.firstCall.args[0])
				.to.contain.subset({
					name: 'user_1',
					associates: [],
					location: {
						city: 'London',
						address: 'Wildersgade'
					}
				});
		});
	});
};
