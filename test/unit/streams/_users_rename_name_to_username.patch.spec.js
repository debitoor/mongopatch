var mongojs = require('mongojs');

module.exports = function(username) {
	describe('patch for ' + username, function() {
		var patch;

		before(function() {
			patch = this.patches.filter(function(p) {
				return (p.document && p.document.name === username);
			})[0];
		});

		it('should be defined', function() {
			chai.expect(patch).to.be.defined;
		});

		it('should contain passed modifier', function() {
			chai.expect(patch.modifier).to.deep.equal({ $rename: { 'name': 'username' } });
		});

		it('should contain matched user document', function() {
			chai.expect(patch).to.have.property('document').to.have.property('name', username);
		});

		it('should contain an user document', function() {
			chai.expect(patch.document).to.include.keys(['name', 'associates', 'location']);
		});

		it('should contain passed query', function() {
			chai.expect(patch).to.have.property('query').to.deep.equal({});
		});

		it('should contain collection being a mongojs object', function() {
			chai.expect(patch).to.have.property('collection').to.be.an.instanceof(mongojs.Collection);
		});

		it('should contain collection having users as name', function() {
			chai.expect(patch.collection.toString()).to.equal(helper.db.toString() + '.users');
		});
	});
};
