var mongojs = require('mongojs');

module.exports = function(index, username) {
	describe('update for ' + username, function() {
		var patch;

		before(function() {
			patch = this.patches[index];
		});

		it('should be defined', function() {
			chai.expect(patch).to.be.defined;
		});

		it('should contain passed modifier', function() {
			chai.expect(patch).to.have.property('modifier').to.deep.equal({ $rename: { name: 'username' } });
		});

		it('should contain updated document', function() {
			chai.expect(patch).to.have.property('updatedDocument').to.have.property('username', username);
		});

		it('should contain updated document without name', function() {
			chai.expect(patch.updatedDocument).to.include.keys(['username', 'associates', 'location']);
		});

		it('should contain original document', function() {
			chai.expect(patch).to.have.property('document').to.have.property('name', username);
		});

		it('should contain original document without username', function() {
			chai.expect(patch.document).to.include.keys(['name', 'associates', 'location']);
		});

		it('should contain query', function() {
			chai.expect(patch).to.have.property('query').to.deep.equal({});
		});

		it('should contain collection being a mongojs object', function() {
			chai.expect(patch).to.have.property('collection').to.be.an.instanceof(mongojs.Collection);
		});

		it('should contain collection having users as name', function() {
			chai.expect(patch.collection.toString()).to.equal(helper.db.toString() + '.users');
		});

		it('should contain document diff', function() {
			chai.expect(patch)
				.to.have.property('diff')
				.to.have.property('document').to.deep.equal({ name: 'removed', username: 'added' });
		});

		it('should contain accumulated diff for all three users', function() {
			chai.expect(patch)
				.to.have.property('diff')
				.to.have.property('accumulated').to.deep.equal({
					name: { added: 0, removed: (index + 1), updated: 0 },
					username: { added: (index + 1), removed: 0, updated: 0 }
				});
		});
	});
};
