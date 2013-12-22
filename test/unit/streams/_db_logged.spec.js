module.exports = function(createStream) {
	describe('logged db', function() {
		var users, logCollection, log;

		describe('log update for single user', function() {
			before(function(done) {
				helper.loadFixture('users', function(err, result) {
					users = result;
					done(err);
				});
			});

			before(function(done) {
				helper.getLogCollection(function(err, result) {
					logCollection = result;
					done(err);
				});
			});

			before(function(done) {
				var loggedStream = createStream(logCollection);

				loggedStream.on('finish', function() {
					done();
				});

				loggedStream.write({
					document: users[0],
					modifier: { $set: { associates: ['user_2'] } },
					collection: helper.db.collection('users'),
					query: { name: 'user_1' }
				});

				loggedStream.end();
			});

			before(function(done) {
				logCollection.find({}, function(err, result) {
					log = result;
					done(err);
				});
			});

			it('should create single log document', function() {
				chai.expect(log.length).to.equal(1);
			});

			it('should contain after document', function() {
				chai.expect(log[0])
					.to.have.property('after')
					.to.contain.subset({
						name: 'user_1',
						associates: ['user_2'],
						location: {
							city: 'Copenhagen',
							address: 'Wildersgade'
						}
					});
			});

			it('should contain before document', function() {
				chai.expect(log[0])
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

			it('should contain modified', function() {
				chai.expect(log[0]).to.have.property('modified').to.be.true;
			});

			it('should contain stringified modifier', function() {
				chai.expect(log[0])
					.to.have.property('modifier')
					.to.equal(JSON.stringify({ $set: { associates: ['user_2'] } }));
			});

			it('should contain stringified query', function() {
				chai.expect(log[0])
					.to.have.property('query')
					.to.equal(JSON.stringify({ name: 'user_1' }));
			});

			it('should contain collection having users as name', function() {
				chai.expect(log[0].collection.toString()).to.equal(helper.db.toString() + '.users');
			});

			it('should contain diff', function() {
				chai.expect(log[0])
					.to.have.property('diff')
					.to.deep.equal({ associates: ['added'] });
			});
		});
	});
};
