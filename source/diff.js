var flat = require('flat');
var traverse = require('traverse');

var diff = function(a, b, options) {
	options = options || {};

	a = flat.flatten(a);
	b = flat.flatten(b);

	var result = options.accumulated || {};

	var all = Object.keys(a).concat(Object.keys(b)).reduce(function(res, k) {
		res[k] = true;
		return res;
	}, {});

	Object.keys(all).forEach(function(k) {
		if (String(a[k]) === String(b[k])) {
			return;
		}
		if (a[k] === null && b[k] === undefined) {
			return;
		}
		if (b[k] === null && a[k] === undefined) {
			return;
		}

		var resultK = options.truncate ? k.replace(/\.\d+(\.|$)/, '.[*]$1') : k;
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
