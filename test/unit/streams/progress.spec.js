var streams = helper.requireSource('streams');

var copy = function(document) {
	var copy = helper.copyJSON(document);
	copy._id = document._id;

	return copy;
};

describe('streams.progress', function() {
	var patches, users;

	before(function(done) {
		helper.loadFixture('users', function(err, result) {
			users = result;
			done(err);
		});
	});

	describe('progress for single user', function() {
		before(function(done) {
			var progressStream = streams.progress(1);

			helper.readStream(progressStream, function(err, result) {
				patches = result;
				done(err);
			});

			var updatedUser = copy(users[0]);
			updatedUser.associates = ['user_2'];

			progressStream.write({
				before: users[0],
				after: updatedUser,
				modifier: { $set: { associates: ['user_2'] } },
				query: { name: 'user_1' },
				collection: helper.db.collection('users'),
				diff: { associates: ['added'] },
				modified: true,
				skipped: false
			});

			progressStream.end();
		});

		it('should contain only one patch', function() {
			chai.expect(patches.length).to.equal(1);
		});

		it('should contain progress data', function() {
			chai.expect(patches[0])
				.to.have.property('progress')
				.to.contain.subset({
					total: 1,
					count: 1,
					modified: 1,
					skipped: 0,
					remaining: 0,
					eta: 0,
					percentage: 100,
					diff: {
						'associates.[*]': { added: 1, removed: 0, updated: 0 }
					}
				});
		});
	});

	describe('progress for all users', function() {
		before(function(done) {
			var progressStream = streams.progress(3);

			helper.readStream(progressStream, function(err, result) {
				patches = result;
				done(err);
			});

			var query = {};
			var modifier = { $rename: { name: 'username' } };
			var collection = helper.db.collection('users');
			var diff = { name: 'removed', username: 'added' };
			var modified = true;
			var skipped = false;

			var updatedUser = function(user) {
				var updatedUser = copy(user);

				// Rename name to username
				updatedUser.username = user.name;
				delete updatedUser.name;

				return updatedUser;
			};

			progressStream.write({
				before: users[0],
				after: updatedUser(users[0]),
				modifier: modifier,
				query: query,
				collection: collection,
				diff: diff,
				modified: modified,
				skipped: skipped
			});

			progressStream.write({
				before: users[1],
				after: updatedUser(users[1]),
				modifier: modifier,
				query: query,
				collection: collection,
				diff: diff,
				modified: modified,
				skipped: skipped
			});

			progressStream.write({
				before: users[2],
				after: updatedUser(users[2]),
				modifier: modifier,
				query: query,
				collection: collection,
				diff: diff,
				modified: modified,
				skipped: skipped
			});

			progressStream.end();
		});

		it('should update three users', function() {
			chai.expect(patches.length).to.equal(3);
		});

		it('should contain progress for user_1', function() {
			chai.expect(patches[0])
				.to.have.property('progress')
				.to.contain.subset({
					total: 3,
					count: 1,
					modified: 1,
					skipped: 0,
					remaining: 2,
					diff: {
						name: { added: 0, removed: 1, updated: 0 },
						username: { added: 1, removed: 0, updated: 0 }
					}
				})
				.to.have.property('percentage').to.closeTo(33.3, 0.1);
		});

		it('should contain progress for user_2', function() {
			chai.expect(patches[1])
				.to.have.property('progress')
				.to.contain.subset({
					total: 3,
					count: 2,
					modified: 2,
					skipped: 0,
					remaining: 1,
					diff: {
						name: { added: 0, removed: 2, updated: 0 },
						username: { added: 2, removed: 0, updated: 0 }
					}
				})
				.to.have.property('percentage').to.closeTo(66.6, 0.1);
		});

		it('should contain progress for user_3', function() {
			chai.expect(patches[2])
				.to.have.property('progress')
				.to.contain.subset({
					total: 3,
					count: 3,
					modified: 3,
					skipped: 0,
					remaining: 0,
					eta: 0,
					diff: {
						name: { added: 0, removed: 3, updated: 0 },
						username: { added: 3, removed: 0, updated: 0 }
					}
				})
				.to.have.property('percentage').to.equal(100);
		});
	});

	describe('progress for skipped user', function() {
		before(function(done) {
			var progressStream = streams.progress(2);

			helper.readStream(progressStream, function(err, result) {
				patches = result;
				done(err);
			});

			var query = { 'location.city': 'Aarhus' };
			var modifier = { $set: { 'location.postcode': 8000 } };
			var collection = helper.db.collection('users');
			var diff = { location: { postcode: 'added' } };

			var updatedUser = copy(users[1]);
			updatedUser.location.postcode = 8000;

			progressStream.write({
				before: users[1],
				after: updatedUser,
				modifier: modifier,
				query: query,
				collection: collection,
				diff: diff,
				modified: true,
				skipped: false
			});

			updatedUser = copy(users[2]);
			updatedUser.location.city = 'Esbjerg';

			progressStream.write({
				before: updatedUser,
				after: null,
				modifier: modifier,
				query: query,
				collection: collection,
				diff: null,
				modified: false,
				skipped: true
			});

			progressStream.end();
		});

		it('should update two users', function() {
			chai.expect(patches.length).to.equal(2);
		});

		it('should contain progress for user_2', function() {
			chai.expect(patches[0])
				.to.have.property('progress')
				.to.contain.subset({
					total: 2,
					count: 1,
					modified: 1,
					skipped: 0,
					remaining: 1,
					diff: {
						'location.postcode': { added: 1, removed: 0, updated: 0 }
					}
				})
				.to.have.property('percentage').to.closeTo(50, 0.1);
		});

		it('should contain progress for skipped user_3', function() {
			chai.expect(patches[1])
				.to.have.property('progress')
				.to.contain.subset({
					total: 2,
					count: 2,
					modified: 1,
					skipped: 1,
					remaining: 0,
					diff: {
						'location.postcode': { added: 1, removed: 0, updated: 0 }
					}
				})
				.to.have.property('percentage').to.closeTo(100, 0.1);
		});
	});
});
