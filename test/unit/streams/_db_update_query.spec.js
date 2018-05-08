module.exports = function(createStream) {
	describe('update query db', function() {
		var users, usersCollection, userDocument, patches;

		describe('externally updated document excluded', function() {
			before(function(done) {
				helper.loadFixture('users', function(err, result) {
					users = result;
					done(err);
				});
			});

			before(function(done) {
				usersCollection = helper.db.collection('users');
				var delayedUsersCollection = helper.delayCollection(usersCollection);

				delayedUsersCollection.onfindandmodify = function(callback) {
					usersCollection.update({ name: 'user_1' }, { $push: { associates: 'user_3' } }, function(err) {
						if (err) {
							return done(err);
						}

						callback();
					});
				};

				var updateStream = createStream();

				helper.readStream(updateStream, function(err, result) {
					patches = result;
					done(err);
				});

				updateStream.write({
					before: users[0],
					modifier: { $set: { associates: ['user_2'] } },
					collection: delayedUsersCollection,
					query: { associates: { $size: 0 } }
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

			it('should have one attempt', function() {
				chai.expect(patches[0]).to.have.property('attempts', 1);
			});

			it('should not update externally changed document', function() {
				chai.expect(userDocument).to.contain.subset({
					name: 'user_1',
					associates: ['user_3'],
					location: {
						city: 'Copenhagen',
						address: 'Wildersgade'
					}
				});
			});
		});

		describe('externally updated document satisfies query', function() {
			before(function(done) {
				helper.loadFixture('users', function(err, result) {
					users = result;
					done(err);
				});
			});

			before(function(done) {
				usersCollection = helper.db.collection('users');
				var delayedUsersCollection = helper.delayCollection(usersCollection);

				delayedUsersCollection.onfindandmodify = function(callback) {
					usersCollection.update({ name: 'user_2' }, { $set: { 'location.city': 'London' } }, function(err) {
						if (err) {
							return done(err);
						}

						callback();
					});
				};

				var updateStream = createStream();

				helper.readStream(updateStream, function(err, result) {
					patches = result;
					done(err);
				});

				updateStream.write({
					before: users[1],
					modifier: { $set: { 'location.address': 'Silkeborg Vej' } },
					collection: delayedUsersCollection,
					query: { name: 'user_2' }
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

			it('should have patch with changed after document', function() {
				chai.expect(patches[0])
					.to.have.property('after')
					.to.contain.subset({
						name: 'user_2',
						associates: ['user_1', 'user_3'],
						location: {
							city: 'London',
							address: 'Silkeborg Vej'
						}
					});
			});

			it('should have modified document', function() {
				chai.expect(patches[0]).to.have.property('modified', true);
			});

			it('should not have skipped document', function() {
				chai.expect(patches[0]).to.have.property('skipped', false);
			});

			it('should have one attempt', function() {
				chai.expect(patches[0]).to.have.property('attempts', 1);
			});

			it('should have diff with all changes', function() {
				chai.expect(patches[0])
					.to.have.property('diff')
					.to.deep.equal({
						location: {
							city: 'updated',
							address: 'updated'
						}
					});
			});

			it('should update externally changed document', function() {
				chai.expect(userDocument).to.contain.subset({
					name: 'user_2',
					associates: ['user_1', 'user_3'],
					location: {
						city: 'London',
						address: 'Silkeborg Vej'
					}
				});
			});
		});
	});
};
