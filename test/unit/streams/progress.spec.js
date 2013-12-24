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
				document: users[0],
				updatedDocument: updatedUser,
				modifier: { $set: { associates: ['user_2'] } },
				query: { name: 'user_1' },
				collection: helper.db.collection('users'),
				diff: { associates: ['added'] },
				modified: true
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

			var updatedUser = function(user) {
				var updatedUser = copy(user);

				// Rename name to username
				updatedUser.username = user.name;
				delete updatedUser.name;

				return updatedUser;
			};

			progressStream.write({
				document: users[0],
				updatedDocument: updatedUser(users[0]),
				modifier: modifier,
				query: query,
				collection: collection,
				diff: diff,
				modified: modified
			});

			progressStream.write({
				document: users[1],
				updatedDocument: updatedUser(users[1]),
				modifier: modifier,
				query: query,
				collection: collection,
				diff: diff,
				modified: modified
			});

			progressStream.write({
				document: users[2],
				updatedDocument: updatedUser(users[2]),
				modifier: modifier,
				query: query,
				collection: collection,
				diff: diff,
				modified: modified
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
});
