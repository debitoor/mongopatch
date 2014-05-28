module.exports = function(createStream) {
	describe('update document db', function() {
		var users, usersCollection, userDocument, worker, patches;

		describe('externally modified property fails query', function() {
			before(function(done) {
				helper.loadFixture('users', function(err, result) {
					users = result;
					done(err);
				});
			});

			before(function(done) {
				usersCollection = helper.db.collection('users');

				worker = sinon.spy(function(document, callback) {
					callback(null, { $set: { 'location.postcode': 8000 } });
				});

				var delayedUsersCollection = helper.delayCollection(usersCollection);

				delayedUsersCollection.onfindandmodify = function(callback) {
					usersCollection.update({ name: 'user_2' }, { $set: { 'location.city': 'London' } }, function(err) {
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
					modifier: { $set: { 'location.postcode': 8000 } },
					collection: delayedUsersCollection,
					query: { 'location.city': 'Aarhus' }
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

			it('should have one attempt', function() {
				chai.expect(patches[0]).to.have.property('attempts', 1);
			});

			it('should not update externally changed document', function() {
				chai.expect(userDocument)
					.to.contain.subset({
						name: 'user_2',
						associates: ['user_1', 'user_3'],
						location: {
							city: 'London',
							address: 'Niels Borhs Vej'
						}
					})
					.not.to.have.deep.property('location.postcode');
			});

			it('should not have called worker', function() {
				chai.expect(worker.callCount).to.equal(0);
			});
		});

		describe('externally added property fails query', function() {
			before(function(done) {
				helper.loadFixture('users', function(err, result) {
					users = result;
					done(err);
				});
			});

			before(function(done) {
				usersCollection = helper.db.collection('users');

				worker = sinon.spy(function(document, callback) {
					callback(null, { $set: { updatedAt: '2014-04-01' } });
				});

				var delayedUsersCollection = helper.delayCollection(usersCollection);

				delayedUsersCollection.onfindandmodify = function(callback) {
					usersCollection.update({ name: 'user_1' }, { $set: { updatedAt: '2014-03-30' } }, function(err) {
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
					modifier: { $set: { updatedAt: '2014-04-01' } },
					collection: delayedUsersCollection,
					query: { updatedAt: { $exists: false } }
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
				chai.expect(userDocument)
					.to.contain.subset({
						name: 'user_1',
						associates: [],
						location: {
							city: 'Copenhagen',
							address: 'Wildersgade'
						}
					})
					.to.have.property('updatedAt', '2014-03-30');
			});

			it('should not have called worker', function() {
				chai.expect(worker.callCount).to.equal(0);
			});
		});

		describe('externally modified property satisfies query', function() {
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

			it('should have patch with changed after document', function() {
				chai.expect(patches[0])
					.to.have.property('after')
					.to.contain.subset({
						name: 'user_1',
						associates: [],
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

			it('should have two attempts', function() {
				chai.expect(patches[0]).to.have.property('attempts', 2);
			});

			it('should have diff with only patched changes', function() {
				chai.expect(patches[0])
					.to.have.property('diff')
					.to.deep.equal({
						location: {
							address: 'updated'
						}
					});
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

			it('should have called worker', function() {
				chai.expect(worker.callCount).to.equal(1);
			});

			it('should have called worker with document and callback', function() {
				chai.expect(worker.firstCall.calledWith(sinon.match.object, sinon.match.func)).to.be.true;
			});

			it('should have called worker with changed document as first argument', function() {
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

		describe('double externally modified property satisfies query', function() {
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

				delayedUsersCollection.onfindandmodify = function(firstCallback) {
					usersCollection.update({ name: 'user_3' }, { $push: { 'associates': 'user_1' } }, function(err) {
						if(err) {
							return done(err);
						}

						delayedUsersCollection.onfindandmodify = function(secondCallback) {
							usersCollection.update({ name: 'user_3' }, { $set: { 'location.city': 'London' } }, function(err) {
								if(err) {
									return done(err);
								}

								delayedUsersCollection.onfindandmodify = null;
								secondCallback();
							});
						};

						firstCallback();
					});
				};

				var updateStream = createStream(worker);

				helper.readStream(updateStream, function(err, result) {
					patches = result;
					done(err);
				});

				updateStream.write({
					before: users[2],
					modifier: { $set: { 'location.address': 'Silkeborg Vej' } },
					collection: delayedUsersCollection,
					query: { name: 'user_3' }
				});

				updateStream.end();
			});

			before(function(done) {
				usersCollection.findOne({ name: 'user_3' }, function(err, result) {
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
						name: 'user_3',
						associates: ['user_2', 'user_1'],
						location: {
							city: 'London',
							address: 'Hovedgade'
						}
					});
			});

			it('should have patch with changed after document', function() {
				chai.expect(patches[0])
					.to.have.property('after')
					.to.contain.subset({
						name: 'user_3',
						associates: ['user_2', 'user_1'],
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

			it('should have three attempts', function() {
				chai.expect(patches[0]).to.have.property('attempts', 3);
			});

			it('should have diff with only patched changes', function() {
				chai.expect(patches[0])
					.to.have.property('diff')
					.to.deep.equal({
						location: {
							address: 'updated'
						}
					});
			});

			it('should update externally changed document', function() {
				chai.expect(userDocument)
					.to.contain.subset({
						name: 'user_3',
						associates: ['user_2', 'user_1'],
						location: {
							city: 'London',
							address: 'Silkeborg Vej'
						}
					});
			});

			it('should have called worker twice', function() {
				chai.expect(worker.callCount).to.equal(2);
			});

			it('should have called worker with changed associates in first call', function() {
				chai.expect(worker.firstCall.args[0])
					.to.contain.subset({
						name: 'user_3',
						associates: ['user_2', 'user_1'],
						location: {
							city: 'Aarhus',
							address: 'Hovedgade'
						}
					});
			});

			it('should have called worker with changed city in second call', function() {
				chai.expect(worker.lastCall.args[0])
					.to.contain.subset({
						name: 'user_3',
						associates: ['user_2', 'user_1'],
						location: {
							city: 'London',
							address: 'Hovedgade'
						}
					});
			});
		});

		describe('externally modified property fails worker', function() {
			before(function(done) {
				helper.loadFixture('users', function(err, result) {
					users = result;
					done(err);
				});
			});

			before(function(done) {
				usersCollection = helper.db.collection('users');

				worker = sinon.spy(function(document, callback) {
					callback(null, null);
				});

				var delayedUsersCollection = helper.delayCollection(usersCollection);

				delayedUsersCollection.onfindandmodify = function(callback) {
					usersCollection.update({ name: 'user_1' }, { $set: { 'location.city': 'London' } }, function(err) {
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

			it('should not have modified document', function() {
				chai.expect(patches[0]).to.have.property('modified', false);
			});

			it('should have skipped document', function() {
				chai.expect(patches[0]).to.have.property('skipped', true);
			});

			it('should have one attempt', function() {
				chai.expect(patches[0]).to.have.property('attempts', 1);
			});

			it('should have patch with no modifier', function() {
				chai.expect(patches[0].modifier).not.to.exist;
			});

			it('should not update externally changed document', function() {
				chai.expect(userDocument)
					.to.contain.subset({
						name: 'user_1',
						associates: [],
						location: {
							city: 'London',
							address: 'Wildersgade'
						}
					});
			});

			it('should have called worker', function() {
				chai.expect(worker.callCount).to.equal(1);
			});

			it('should have called worker with changed document as first argument', function() {
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

		describe('update using fallback', function() {
			before(function(done) {
				helper.loadFixture('users', function(err, result) {
					users = result;
					done(err);
				});
			});

			before(function(done) {
				usersCollection = helper.db.collection('users');
				worker = sinon.spy();

				var updateStream = createStream(worker);

				helper.readStream(updateStream, function(err, result) {
					patches = result;
					done(err);
				});

				updateStream.write({
					before: users[0],
					modifier: { $set: { 'location.address': 'Silkeborg Vej' } },
					collection: usersCollection,
					query: { name: 'user_1' },
					attempts: 5
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

			it('should have modified document', function() {
				chai.expect(patches[0]).to.have.property('modified', true);
			});

			it('should not have skipped document', function() {
				chai.expect(patches[0]).to.have.property('skipped', false);
			});

			it('should attempted one more time', function() {
				chai.expect(patches[0]).to.have.property('attempts', 6);
			});

			it('should update document', function() {
				chai.expect(userDocument)
					.to.contain.subset({
						name: 'user_1',
						associates: [],
						location: {
							city: 'Copenhagen',
							address: 'Silkeborg Vej'
						}
					});
			});

			it('should not have called worker', function() {
				chai.expect(worker.callCount).to.equal(0);
			});
		});

		describe('update fails using fallback', function() {
			before(function(done) {
				helper.loadFixture('users', function(err, result) {
					users = result;
					done(err);
				});
			});

			before(function(done) {
				usersCollection = helper.db.collection('users');
				worker = sinon.spy();

				var updateStream = createStream(worker);
				var user = users[0];

				helper.readStream(updateStream, function(err, result) {
					patches = result;
					done(err);
				});

				user.location.city = 'London';

				updateStream.write({
					before: user,
					modifier: { $set: { 'location.address': 'Silkeborg Vej' } },
					collection: usersCollection,
					query: { name: 'user_1' },
					attempts: 5
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

			it('should not have modified document', function() {
				chai.expect(patches[0]).to.have.property('modified', false);
			});

			it('should have skipped document', function() {
				chai.expect(patches[0]).to.have.property('skipped', true);
			});

			it('should attempted one more time', function() {
				chai.expect(patches[0]).to.have.property('attempts', 6);
			});

			it('should update document', function() {
				chai.expect(userDocument)
					.to.contain.subset({
						name: 'user_1',
						associates: [],
						location: {
							city: 'Copenhagen',
							address: 'Wildersgade'
						}
					});
			});

			it('should not have called worker', function() {
				chai.expect(worker.callCount).to.equal(0);
			});
		});

		describe('update using fallback (document with complex types)', function() {
			var comments, commentsCollection, commentDocument;

			before(function(done) {
				helper.loadFixture('comments', { copy: false }, function(err, result) {
					comments = result;
					done(err);
				});
			});

			before(function(done) {
				commentsCollection = helper.db.collection('comments');
				worker = sinon.spy();

				var updateStream = createStream(worker);

				helper.readStream(updateStream, function(err, result) {
					patches = result;
					done(err);
				});

				updateStream.write({
					before: comments[1],
					modifier: { $set: { content: '> User has been banned for this comment' } },
					collection: commentsCollection,
					query: { owner: 'user_1', title: 'title_2' },
					attempts: 5
				});

				updateStream.end();
			});

			before(function(done) {
				commentsCollection.findOne({ owner: 'user_1', title: 'title_2' }, function(err, result) {
					commentDocument = result;
					done(err);
				});
			});

			it('should only patch one comment', function() {
				chai.expect(patches.length).to.equal(1);
			});

			it('should have modified document', function() {
				chai.expect(patches[0]).to.have.property('modified', true);
			});

			it('should not have skipped document', function() {
				chai.expect(patches[0]).to.have.property('skipped', false);
			});

			it('should attempted one more time', function() {
				chai.expect(patches[0]).to.have.property('attempts', 6);
			});

			it('should update document', function() {
				chai.expect(commentDocument)
					.to.contain.subset({
						owner: 'user_1',
						album: 'album_1',
						title: 'title_2',
						content: '> User has been banned for this comment'
					});
			});

			it('should not have called worker', function() {
				chai.expect(worker.callCount).to.equal(0);
			});
		});
	});
};
