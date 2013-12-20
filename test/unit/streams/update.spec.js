var mongojs = require('mongojs');
var streams = helper.requireSource('streams');

describe('streams.update', function() {
	var patches, users;

	describe('apply update for single user', function() {
		before(function(done) {
			helper.loadFixture('users', function(err, result) {
				users = result;
				done(err);
			});
		});

		before(function(done) {
			var updateStream = streams.update();

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

		it('should contain document diff', function() {
			chai.expect(patches[0]).to.have.property('diff').to.have.property('document').to.deep.equal({ associates: ['added'] });
		});

		it('should contain accumulated diff', function() {
			chai.expect(patches[0])
				.to.have.property('diff')
				.to.have.property('accumulated').to.deep.equal({ 'associates.[*]': { added: 1, removed: 0, updated: 0 } });
		});
	});
});
