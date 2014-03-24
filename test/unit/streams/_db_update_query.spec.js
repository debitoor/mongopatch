module.exports = function(createStream) {
	var users, usersCollection, userDocument;

	describe('externally updated document excluded', function() {
		var patches;

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
					if(err) {
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
};
