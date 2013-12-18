var helper = require('../helper');
var flat = require('flat');
var streams = helper.requireSource('streams');

var diff = function(acc, a, b, truncateArray) {
	return streams._.diff(acc, flat.flatten(a), flat.flatten(b), truncateArray);
};

describe('diff', function() {
	var result;

	describe('same objects have empty diff', function() {
		beforeEach(function() {
			var a = {
				hello: 'world',
				hej: 'verden',
				hola: 'mundo',
				lang: ['en', 'dk', 'es'],
				countries: {
					en: { name: 'England' },
					dk: { name: 'Denmark' },
					es: { name: 'Spain' }
				}
			};
			var b = {
				hello: 'world',
				hej: 'verden',
				hola: 'mundo',
				lang: ['en', 'dk', 'es'],
				countries: {
					en: { name: 'England' },
					dk: { name: 'Denmark' },
					es: { name: 'Spain' }
				}
			};

			result = diff({}, a, b);
		});

		it('should be empty diff', function() {
			chai.expect(result).to.be.empty;
		});
	});

	describe('different objects should have diff', function() {
		beforeEach(function() {
			var a = {
				hello: 'world',
				hej: 'verden',
				hola: 'mundo',
				lang: ['en', 'dk', 'es'],
				countries: {
					en: { name: 'England' },
					dk: { name: 'Denmark' },
					es: { name: 'Spain' }
				}
			};
			var b = {
				hello: 'world',
				hej: 'verden_1',
				hola: 'mundo',
				hallo: 'welt',
				lang: ['en', 'dk', 'es'],
				countries: {
					dk: { name: 'Denmark' },
					es: { name: 'Spain' }
				}
			};

			result = diff({}, a, b);
		});

		it('should have updated property hej', function() {
			chai.expect(result).to.have.property('hej').to.deep.equal({ added: 0, removed: 0, updated: 1 });
		});

		it('should have removed property countries.en.name', function() {
			chai.expect(result).to.have.property('countries.en.name').to.deep.equal({ added: 0, removed: 1, updated: 0 });
		});

		it('should have added property hallo', function() {
			chai.expect(result).to.have.property('hallo').to.deep.equal({ added: 1, removed: 0, updated: 0 });
		});
	});
});
