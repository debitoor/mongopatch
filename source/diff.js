var flat = require('flat');
var traverse = require('traverse');

var isArray = Array.isArray;
var isObject = function(obj) {
	return obj !== null && (typeof obj === 'object') && obj.constructor === Object;
};

var simplify = function(o) {
	return traverse(o).map(function(obj) {
		if(!isArray(obj) && !isObject(obj)) {
			if(obj === null || obj === undefined) {
				this.remove();
				return;
			}

			var klass = obj.constructor.name;
			this.update(klass + '#' + String(obj), true);
		}
	});
};

var diff = function(a, b, options) {
	options = options || {};

	a = flat.flatten(simplify(a));
	b = flat.flatten(simplify(b));

	var result = options.accumulated || {};

	var all = Object.keys(a).concat(Object.keys(b)).reduce(function(res, k) {
		res[k] = true;
		return res;
	}, {});

	Object.keys(all).forEach(function(k) {
		if (a[k] === b[k]) {
			return;
		}

		var resultK = options.group ? k.replace(/\.\d+(\.|$)/, '.[*]$1') : k;
		var r = result[resultK];

		result[resultK] = r = r || { added: 0, removed: 0, updated: 0 };

		if(!(k in b)) {
			return r.removed++;
		}
		if(!(k in a)) {
			return r.added++;
		}

		r.updated++;
	});

	return result;
};

var deep = function(a, b, options) {
	var change = diff(a, b, options);

	Object.keys(change).forEach(function(key) {
		var c = change[key];
		change[key] = (c.added && 'added') || (c.removed && 'removed') || (c.updated && 'updated');
	});

	change = flat.unflatten(change);
	change = traverse(change).map(function(obj) {
		if(!Array.isArray(obj)) {
			return;
		}

		this.update(obj.filter(function(value) {
			return value !== undefined;
		}));
	});

	return change;
};

diff.deep = deep;

module.exports = diff;
