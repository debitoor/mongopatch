var async = require('async');
var once = require('once');

module.exports = function(createStream) {
	var setup = function(options, callback) {
		var users, logCollection, err;

		async.waterfall([
			function(next) {
				helper.loadFixture('users', next);
			},
			function(result, next) {
				users = result;
				helper.getLogCollection(next);
			},
			function(result, next) {
				logCollection = result;
				next = once(next);

				var loggedStream = createStream(logCollection, options);

				loggedStream.on('finish', function() {
					next();
				});
				loggedStream.on('error', function(result) {
					err = result;
					next();
				});

				loggedStream.write({
					before: users[0],
					modifier: { $set: { associates: ['user_2'] } },
					collection: helper.db.collection('users'),
					query: { name: 'user_1' }
				});

				loggedStream.end();
			},
			function(next) {
				logCollection.find({}, next);
			},
			function(log) {
				callback(err, users, log);
			}
		], callback);
	};

	describe('logged db', function() {
		var users, log;

		describe('log update for single user', function() {
			before(function(done) {
				setup(null, function(err, u, l) {
					users = u;
					log = l;

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

			it('should contain skipped', function() {
				chai.expect(log[0]).to.have.property('skipped').to.be.false;
			});

			it('should contain attempts', function() {
				chai.expect(log[0]).to.have.property('attempts').to.equal(1);
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

		describe('log error', function() {
			var err;

			var afterCallback = function(update, callback) {
				callback(new Error('Invalid update'));
			};

			before(function(done) {
				setup({ afterCallback: afterCallback }, function(e, u, l) {
					err = e;

					users = u;
					log = l;

					done();
				});
			});

			it('should emit an error', function() {
				chai.expect(err).to.be.defined;
			});

			it('should create single log document', function() {
				chai.expect(log.length).to.equal(1);
			});

			it('should contain patch data', function() {
				chai.expect(log[0])
					.to.contain.keys(['before', 'after', 'modified', 'modifier', 'query', 'collection', 'diff']);
			});

			it('should contain error', function() {
				chai.expect(log[0])
					.to.have.property('error')
					.to.contain.keys(['message', 'stack']);
			});
		});
	});
};
