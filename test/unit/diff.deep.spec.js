var diff = helper.requireSource('diff');

describe('diff.deep', function() {
	var result;

	describe('added single, nested array item', function() {
		beforeEach(function() {
			var a = {
				hello: 'world',
				lang: [{ name: 'England' }]
			};
			var b = {
				hello: 'world',
				lang: [{ name: 'England' }, { name: 'Denmark' }]
			};

			result = diff.deep(a, b);
		});

		it('should have added first item', function() {
			chai.expect(result).to.deep.equal({ lang: [{ name: 'added' }] });
		});
	});

	describe('change multiple, nested array items', function() {
		beforeEach(function() {
			var a = {
				hello: 'world',
				lang: [{ name: 'England' }, { name: 'Germany' }]
			};
			var b = {
				hello: 'world',
				lang: [{ name: 'England' }, { name: 'Spain' }, { name: 'Denmark' }]
			};

			result = diff.deep(a, b);
		});

		it('should have added first item', function() {
			chai.expect(result).to.deep.equal({ lang: [{ name: 'updated' }, { name: 'added' }] });
		});
	});

	describe('different objects should have multiple diff', function() {
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
				hej: 'welt',
				hola: 'mundo',
				hallo: 'welt',
				lang: ['en', 'dk', 'es'],
				countries: {
					dk: { name: 'Denmark' },
					es: { name: 'Spain' }
				}
			};

			result = diff.deep(a, b);
		});

		it('should only have three changes', function() {
			chai.expect(Object.keys(result).length).to.equal(3);
		});

		it('should have updated property hej', function() {
			chai.expect(result).to.have.property('hej').to.equal('updated');
		});

		it('should have removed property countries.en.name', function() {
			chai.expect(result).to.have.property('countries').to.deep.equal({ en: { name: 'removed' } });
		});

		it('should have added property hallo', function() {
			chai.expect(result).to.have.property('hallo').to.equal('added');
		});
	});
});
