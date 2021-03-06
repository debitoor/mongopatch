var diff = helper.requireSource('diff');

describe('diff', function() {
	var result;

	describe('added single property', function() {
		before(function() {
			var a = {
				hello: 'world'
			};
			var b = {
				hello: 'world',
				hej: 'verden'
			};

			result = diff(a, b);
		});

		it('should only contain added', function() {
			chai.expect(result).to.deep.equal({ hej: { added: 1, removed: 0, updated: 0 } });
		});
	});

	describe('removed single property', function() {
		before(function() {
			var a = {
				hello: 'world',
				hej: 'verden'
			};
			var b = {
				hello: 'world'
			};

			result = diff(a, b);
		});

		it('should only contain added', function() {
			chai.expect(result).to.deep.equal({ hej: { added: 0, removed: 1, updated: 0 } });
		});
	});

	describe('updated single property', function() {
		before(function() {
			var a = {
				hello: 'world',
				hej: 'welt'
			};
			var b = {
				hello: 'world',
				hej: 'verden'
			};

			result = diff(a, b);
		});

		it('should only contain added', function() {
			chai.expect(result).to.deep.equal({ hej: { added: 0, removed: 0, updated: 1 } });
		});
	});

	describe('added single, nested property', function() {
		before(function() {
			var a = {
				countries: {
					en: { name: 'England' }
				}
			};
			var b = {
				countries: {
					en: { name: 'England' },
					dk: { name: 'Denmark' }
				}
			};

			result = diff(a, b);
		});

		it('should only contain added', function() {
			chai.expect(result).to.deep.equal({ 'countries.dk.name': { added: 1, removed: 0, updated: 0 } });
		});
	});

	describe('removed single, nested property', function() {
		before(function() {
			var a = {
				countries: {
					en: { name: 'England' },
					dk: { name: 'Denmark' }
				}
			};
			var b = {
				countries: {
					en: { name: 'England' }
				}
			};

			result = diff(a, b);
		});

		it('should only contain added', function() {
			chai.expect(result).to.deep.equal({ 'countries.dk.name': { added: 0, removed: 1, updated: 0 } });
		});
	});

	describe('updated single, nested property', function() {
		before(function() {
			var a = {
				countries: {
					en: { name: 'England' },
					dk: { name: 'Germany' }
				}
			};
			var b = {
				countries: {
					en: { name: 'England' },
					dk: { name: 'Denmark' }
				}
			};

			result = diff(a, b);
		});

		it('should only contain added', function() {
			chai.expect(result).to.deep.equal({ 'countries.dk.name': { added: 0, removed: 0, updated: 1 } });
		});
	});

	describe('added single array item', function() {
		before(function() {
			var a = {
				lang: ['en']
			};
			var b = {
				lang: ['en', 'dk']
			};

			result = diff(a, b);
		});

		it('should only contain added', function() {
			chai.expect(result).to.deep.equal({ 'lang.1': { added: 1, removed: 0, updated: 0 } });
		});
	});

	describe('removed single array item', function() {
		before(function() {
			var a = {
				lang: ['en', 'dk']
			};
			var b = {
				lang: ['en']
			};

			result = diff(a, b);
		});

		it('should only contain added', function() {
			chai.expect(result).to.deep.equal({ 'lang.1': { added: 0, removed: 1, updated: 0 } });
		});
	});

	describe('updated single array item', function() {
		before(function() {
			var a = {
				lang: ['en', 'dk']
			};
			var b = {
				lang: ['en', 'de']
			};

			result = diff(a, b);
		});

		it('should only contain added', function() {
			chai.expect(result).to.deep.equal({ 'lang.1': { added: 0, removed: 0, updated: 1 } });
		});
	});

	describe('added single, nested array item', function() {
		before(function() {
			var a = {
				lang: [{ name: 'England' }]
			};
			var b = {
				lang: [{ name: 'England' }, { name: 'Denmark' }]
			};

			result = diff(a, b);
		});

		it('should only contain added', function() {
			chai.expect(result).to.deep.equal({ 'lang.1.name': { added: 1, removed: 0, updated: 0 } });
		});
	});

	describe('removed single, nested array item', function() {
		before(function() {
			var a = {
				lang: [{ name: 'England' }, { name: 'Denmark' }]
			};
			var b = {
				lang: [{ name: 'England' }]
			};

			result = diff(a, b);
		});

		it('should only contain added', function() {
			chai.expect(result).to.deep.equal({ 'lang.1.name': { added: 0, removed: 1, updated: 0 } });
		});
	});

	describe('updated single, nested array item', function() {
		before(function() {
			var a = {
				lang: [{ name: 'England' }, { name: 'Denmark' }]
			};
			var b = {
				lang: [{ name: 'England' }, { name: 'Germany' }]
			};

			result = diff(a, b);
		});

		it('should only contain added', function() {
			chai.expect(result).to.deep.equal({ 'lang.1.name': { added: 0, removed: 0, updated: 1 } });
		});
	});

	describe('unshift array item', function() {
		before(function() {
			var a = {
				lang: [{ name: 'England' }]
			};
			var b = {
				lang: [{ name: 'Germany' }, { name: 'England' }]
			};

			result = diff(a, b);
		});

		it('should only have two changes', function() {
			chai.expect(Object.keys(result).length).to.equal(2);
		});

		it('should have updated first item', function() {
			chai.expect(result).to.have.property('lang.0.name').to.deep.equal({ added: 0, removed: 0, updated: 1 });
		});

		it('should have added second item', function() {
			chai.expect(result).to.have.property('lang.1.name').to.deep.equal({ added: 1, removed: 0, updated: 0 });
		});
	});

	describe('added empty array', function() {
		before(function() {
			var a = {
				hello: 'world'
			};
			var b = {
				hello: 'world',
				lang: []
			};

			result = diff(a, b);
		});

		it('should register empty array as added', function() {
			chai.expect(result).to.deep.equal({ lang: { added: 1, removed: 0, updated: 0 } });
		});
	});

	describe('removed empty array', function() {
		before(function() {
			var a = {
				hello: 'world',
				lang: []
			};
			var b = {
				hello: 'world'
			};

			result = diff(a, b);
		});

		it('should register empty array as removed', function() {
			chai.expect(result).to.deep.equal({ lang: { added: 0, removed: 1, updated: 0 } });
		});
	});

	describe('updated empty array', function() {
		before(function() {
			var a = {
				hello: 'world',
				lang: []
			};
			var b = {
				hello: 'world',
				lang: true
			};

			result = diff(a, b);
		});

		it('should only contain updated', function() {
			chai.expect(result).to.deep.equal({ lang: { added: 0, removed: 0, updated: 1 } });
		});
	});

	describe('add item to empty array', function() {
		before(function() {
			var a = {
				lang: []
			};
			var b = {
				lang: ['es']
			};

			result = diff(a, b);
		});

		it('should only contain added', function() {
			chai.expect(result).to.deep.equal({ 'lang.0': { added: 1, removed: 0, updated: 0 } });
		});
	});

	describe('remove item from empty array', function() {
		before(function() {
			var a = {
				lang: ['es']
			};
			var b = {
				lang: []
			};

			result = diff(a, b);
		});

		it('should only contain removed', function() {
			chai.expect(result).to.deep.equal({ 'lang.0': { added: 0, removed: 1, updated: 0 } });
		});
	});

	describe('added empty object', function() {
		before(function() {
			var a = {
				hello: 'world'
			};
			var b = {
				hello: 'world',
				lang: {}
			};

			result = diff(a, b);
		});

		it('should register empty object as added', function() {
			chai.expect(result).to.deep.equal({ lang: { added: 1, removed: 0, updated: 0 } });
		});
	});

	describe('removed empty object', function() {
		before(function() {
			var a = {
				hello: 'world',
				lang: {}
			};
			var b = {
				hello: 'world'
			};

			result = diff(a, b);
		});

		it('should register empty object as removed', function() {
			chai.expect(result).to.deep.equal({ lang: { added: 0, removed: 1, updated: 0 } });
		});
	});

	describe('updated empty object', function() {
		before(function() {
			var a = {
				hello: 'world',
				lang: true
			};
			var b = {
				hello: 'world',
				lang: {}
			};

			result = diff(a, b);
		});

		it('should onyl contain updated', function() {
			chai.expect(result).to.deep.equal({ lang: { added: 0, removed: 0, updated: 1 } });
		});
	});

	describe('add key to empty object', function() {
		before(function() {
			var a = {
				lang: {}
			};
			var b = {
				lang: { es: 'Spain' }
			};

			result = diff(a, b);
		});

		it('should only contain added', function() {
			chai.expect(result).to.deep.equal({ 'lang.es': { added: 1, removed: 0, updated: 0 } });
		});
	});

	describe('remove key from empty object', function() {
		before(function() {
			var a = {
				lang: { es: 'Spain' }
			};
			var b = {
				lang: {}
			};

			result = diff(a, b);
		});

		it('should only contain removed', function() {
			chai.expect(result).to.deep.equal({ 'lang.es': { added: 0, removed: 1, updated: 0 } });
		});
	});

	describe('added null', function() {
		before(function() {
			var a = {
				hello: 'world',
			};
			var b = {
				hello: 'world',
				hej: null
			};

			result = diff(a, b);
		});

		it('should not register null as added', function() {
			chai.expect(result).to.be.empty;
		});
	});

	describe('removed null', function() {
		before(function() {
			var a = {
				hello: 'world',
				hej: null
			};
			var b = {
				hello: 'world',
			};

			result = diff(a, b);
		});

		it('should not register null as removed', function() {
			chai.expect(result).to.be.empty;
		});
	});

	describe('added undefined', function() {
		before(function() {
			var a = {
				hello: 'world',
			};
			var b = {
				hello: 'world',
				hej: undefined
			};

			result = diff(a, b);
		});

		it('should not register undefined as added', function() {
			chai.expect(result).to.be.empty;
		});
	});

	describe('removed undefined', function() {
		before(function() {
			var a = {
				hello: 'world',
				hej: undefined
			};
			var b = {
				hello: 'world',
			};

			result = diff(a, b);
		});

		it('should not register undefined as removed', function() {
			chai.expect(result).to.be.empty;
		});
	});

	describe('added complex object', function() {
		before(function() {
			var K = function(i) { this.i = i; };

			var a = {
				hello: 'world',
			};
			var b = {
				hello: 'world',
				hej: new K(0)
			};

			result = diff(a, b);
		});

		it('should not diff internals', function() {
			chai.expect(result).to.deep.equal({ hej: { added: 1, removed: 0, updated: 0 } });
		});
	});

	describe('removed complex object', function() {
		before(function() {
			var K = function(i) { this.i = i; };

			var a = {
				hello: 'world',
				hej: new K(0)
			};
			var b = {
				hello: 'world',
			};

			result = diff(a, b);
		});

		it('should not diff internals', function() {
			chai.expect(result).to.deep.equal({ hej: { added: 0, removed: 1, updated: 0 } });
		});
	});

	describe('updated complex object', function() {
		before(function() {
			var K = function(i) { this.i = i; };
			K.prototype.toString = function() { return this.i.toString(); };

			var a = {
				hello: 'world',
				hej: new K(0)
			};
			var b = {
				hello: 'world',
				hej: new K(1)
			};

			result = diff(a, b);
		});

		it('should not diff internals', function() {
			chai.expect(result).to.deep.equal({ hej: { added: 0, removed: 0, updated: 1 } });
		});
	});

	describe('updated string to boolean', function() {
		before(function() {
			var a = {
				hello: 'true'
			};
			var b = {
				hello: true
			};

			result = diff(a, b);
		});

		it('should contain updated', function() {
			chai.expect(result).to.deep.equal({ hello: { added: 0, removed: 0, updated: 1 } });
		});
	});

	describe('updated number to string', function() {
		before(function() {
			var a = {
				hello: 10
			};
			var b = {
				hello: '10'
			};

			result = diff(a, b);
		});

		it('should contain updated', function() {
			chai.expect(result).to.deep.equal({ hello: { added: 0, removed: 0, updated: 1 } });
		});
	});

	describe('remove sub tree', function() {
		before(function() {
			var a = {
				countries: {
					en: { name: 'England' },
					de: { name: 'Gernamy' }
				}
			};
			var b = {
				countries: {
					en: { name: 'England' },
					de: false
				}
			};

			result = diff(a, b);
		});

		it('should diff longest path', function() {
			chai.expect(result).to.deep.equal({ 'countries.de.name': { added: 0, removed: 1, updated: 0 } });
		});
	});

	describe('add sub tree', function() {
		before(function() {
			var a = {
				countries: {
					en: { name: 'England' },
					de: false
				}
			};
			var b = {
				countries: {
					en: { name: 'England' },
					de: { name: 'Gernamy' }
				}
			};

			result = diff(a, b);
		});

		it('should diff longest path', function() {
			chai.expect(result).to.deep.equal({ 'countries.de.name': { added: 1, removed: 0, updated: 0 } });
		});
	});

	describe('update sub tree', function() {
		before(function() {
			var a = {
				countries: {
					en: { name: ['United Kingdom', 'England'] }
				}
			};
			var b = {
				countries: {
					en: { location: 'Scotland' }
				}
			};

			result = diff(a, b);
		});

		it('should diff longest path', function() {
			chai.expect(result).to.deep.equal({
				'countries.en.name.0': { added: 0, removed: 1, updated: 0 },
				'countries.en.name.1': { added: 0, removed: 1, updated: 0 },
				'countries.en.location': { added: 1, removed: 0, updated: 0 }
			});
		});
	});

	describe('same objects have empty diff', function() {
		before(function() {
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

			result = diff(a, b);
		});

		it('should be empty diff', function() {
			chai.expect(result).to.be.empty;
		});
	});

	describe('different objects should have multiple diff', function() {
		before(function() {
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

			result = diff(a, b);
		});

		it('should only have three changes', function() {
			chai.expect(Object.keys(result).length).to.equal(3);
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

	describe('added single array item with group', function() {
		before(function() {
			var a = {
				lang: ['en']
			};
			var b = {
				lang: ['en', 'dk']
			};

			result = diff(a, b, { group: true });
		});

		it('should only contain grouped added', function() {
			chai.expect(result).to.deep.equal({ 'lang.[*]': { added: 1, removed: 0, updated: 0 } });
		});
	});

	describe('removed single, nested array item with group', function() {
		before(function() {
			var a = {
				lang: [{ name: 'England' }, { name: 'Denmark' }]
			};
			var b = {
				lang: [{ name: 'England' }]
			};

			result = diff(a, b, { group: true });
		});

		it('should only contain grouped removed', function() {
			chai.expect(result).to.deep.equal({ 'lang.[*].name': { added: 0, removed: 1, updated: 0 } });
		});
	});

	describe('change multiple array items with group', function() {
		before(function() {
			var a = {
				lang: [{ name: 'England' }, { name: 'Denmark' }]
			};
			var b = {
				lang: [{ name: 'Germany' }]
			};

			result = diff(a, b, { group: true });
		});

		it('should contain grouped removed and updated', function() {
			chai.expect(result).to.deep.equal({ 'lang.[*].name': { added: 0, removed: 1, updated: 1 } });
		});
	});
});
