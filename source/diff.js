var flat = require('flat');
var traverse = require('traverse');

var isArray = Array.isArray;
var isObject = function(obj) {
	return obj !== null && (typeof obj === 'object') && obj.constructor === Object;
};

var flatten = function(o, all, prefixes) {
	var result = {};
	var add = function(path, value) {
		var key = path.join('.');
		var l = 0;

		for (var i = 0; i < path.length - 1; i++) {
			l += path[i].length;
			prefixes[key.slice(0, l + i)] = true;
		}

		all[key] = true;
		result[key] = value;
	};

	traverse(o).forEach(function(obj) {
		if (!isArray(obj) && !isObject(obj)) {
			if (obj === null || obj === undefined) {
				return;
			}

			var v = obj.constructor.name + '#' + obj;
			add(this.path, v);

			this.block();
		} else if (this.isLeaf && !this.isRoot) {
			// Empty array or object
			add(this.path, isArray(obj) ? 'Array#[]' : 'Object#{}');
		}
	});

	return result;
};

var diff = function(a, b, options) {
	options = options || {};

	var all = {};
	var prefixes = {};

	a = flatten(a, all, prefixes);
	b = flatten(b, all, prefixes);

	var result = options.accumulate || {};

	Object.keys(all).forEach(function(k) {
		if (prefixes[k]) {
			return;
		}
		if (a[k] === b[k]) {
			return;
		}

		var resultK = options.group ? k.replace(/\.\d+(\.|$)/, '.[*]$1') : k;
		var r = result[resultK];

		result[resultK] = r = r || { added: 0, removed: 0, updated: 0 };

		if (!(k in b)) {
			return r.removed++;
		}
		if (!(k in a)) {
			return r.added++;
		}

		r.updated++;
	});

	return result;
};

var deep = function(a, b, options) {
	var change = diff(a, b);

	Object.keys(change).forEach(function(key) {
		var c = change[key];
		change[key] = (c.added && 'added') || (c.removed && 'removed') || (c.updated && 'updated');
	});

	change = flat.unflatten(change, options);
	change = traverse(change).map(function(obj) {
		if (!Array.isArray(obj)) {
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
