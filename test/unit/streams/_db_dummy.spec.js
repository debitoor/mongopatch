module.exports = function(createStream) {
	describe('dummy db', function() {
		var users, usersCollection, userDocument;

		describe('update not persisted for single user', function() {
			before(function(done) {
				helper.loadFixture('users', function(err, result) {
					users = result;
					done(err);
				});
			});

			before(function(done) {
				usersCollection = helper.db.collection('users');

				var updateStream = createStream();

				updateStream.on('finish', function() {
					done();
				});

				updateStream.write({
					before: users[0],
					modifier: { $set: { associates: ['user_2'] } },
					collection: usersCollection,
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

			it('should not have persisted document', function() {
				chai.expect(userDocument).to.contain.subset({
					name: 'user_1',
					associates: [],
					location: {
						city: 'Copenhagen',
						address: 'Wildersgade'
					}
				});
			});
		});
	});
};
