var fs = require('fs');
var path = require('path');
var util = require('util');

var camelize = require('camelize');
var minimist = require('minimist');

var OPTIONS = [
	'config',
	'update',
	'dryRun',
	'db',
	'logDb',
	'parallel',
	'output',
	'force',
	'setup',
	'version'
];

var error = function(type, data) {
	var args = Array.prototype.slice.call(arguments, 2);
	return { type: type, data: data, message: util.format.apply(null, args) };
};

var findFile = function(name, dir) {
	var filePath = path.join(dir, name);

	if(fs.existsSync(filePath)) {
		return filePath;
	}

	var parent = path.resolve(dir, '../');

	if(dir === parent) {
		return null;
	}

	return findFile(name, parent);
};

var Configuration = function() {
	this.options = {};
	this.errors = [];
};

Configuration.prototype.set = function(key, value) {
	key = camelize(key.replace(/^--/, ''));
	this.options[key] = value;

	return this;
};

Configuration.prototype.extend = function(options) {
	var self = this;

	Object.keys(options).forEach(function(key) {
		self.set(key, options[key]);
	});

	return this;
};

Configuration.prototype.file = function(filepath) {
	try {
		var content = fs.readFileSync(filepath, 'utf-8');
		this.extend(JSON.parse(content));
	} catch(err) {
		err.path = filepath;
		this.errors.push(err);
	}

	return this;
};

Configuration.prototype.dotfile = function(name, dir) {
	if(fs.statSync(dir).isFile()) {
		dir = path.dirname(dir);
	}

	var filepath = findFile(name, dir);

	if(filepath) {
		this.file(filepath);
	}

	return this;
};

var normalizeBoolean = function(value) {
	return (typeof value === 'boolean') ? value : (value === 'true');
};

var normalizeOptions = function(options, cwd) {
	options.dryRun = ('dryRun' in options) || options.update === 'dummy';
	if(options.dryRun) {
		options.update = 'dummy';
	}

	if('parallel' in options) {
		options.parallel = parseInt(options.parallel, 10) || 10;
	}

	if(options.setup) {
		options.setup = path.resolve(process.cwd(), options.setup);
	}

	if('output' in options) {
		options.output = normalizeBoolean(options.output);
	}

	if('force' in options) {
		options.force = normalizeBoolean(options.force);
	}

	if('version' in options) {
		options.version = normalizeBoolean(options.version);
	}

	return options;
};

var validateDefined = function(options) {
	var invalidOptions = Object.keys(options).filter(function(arg) {
		return OPTIONS.indexOf(arg) === -1;
	});

	if(invalidOptions.length) {
		var key = invalidOptions.shift();
		var data = {};

		data[key] = options[key] || null;

		return error('invalid_option', data, 'Uknown option: %s', key);
	}
};

var validateOptions = function(options) {
	var err = validateDefined(options);

	if(err) {
		return err;
	}

	if(!options.db) {
		return error('invalid_option', { db: null }, '--db option required');
	}

	if(!options.update) {
		return error('invalid_option', { update: null }, '--update option required');
	}
	if(['dummy', 'query', 'document'].indexOf(options.update) < 0) {
		return error('invalid_option', { update: options.update }, '--update option invalid');
	}

	if(options.update !== 'dummy' && !options.logDb && !options.force) {
		return error('invalid_option', { logDb: null }, '--log-db option required');
	}

	if(options.setup && !fs.existsSync(options.setup)) {
		return error('invalid_option', { setup: (options.setup || null) }, 'Cannot find setup script with path "%s"', options.setup);
	}
};

var validatePatch = function(patch) {
	if(!patch) {
		return error('patch', { path: null }, 'Patch path required');
	}
	if(!fs.existsSync(patch)) {
		return error('patch', { path: patch }, 'Cannot find patch at path "%s"', patch);
	}
};

var parse = function(argv, cwd) {
	var options = minimist(argv);
	var patch = options._[0];
	delete options._;

	patch = patch && path.resolve(cwd, patch);

	var that = {
		argv: argv,
		patch: patch,
		options: {}
	};

	var err = validatePatch(patch);

	if(err) {
		that.error = err;
		return that;
	}

	var configuration = new Configuration();

	configuration
		.extend({
			update: 'document',
			output: true,
			force: false,
			version: false
		})
		.dotfile('.mongopatch', patch);

	if(options.config) {
		options.config = path.resolve(cwd, options.config);
		configuration.file(options.config);
	}

	err = configuration.errors[0];

	if(err) {
		that.error = error('config', { path: err.path }, 'Invalid config file at path "%s"', err.path);
		return that;
	}

	configuration.extend(options);

	options = configuration.options;
	options = normalizeOptions(options, cwd);
	err = validateOptions(options);

	if(err) {
		that.error = err;
		return that;
	}

	that.options = options;
	return that;
};

module.exports = function(argv, cwd) {
	argv = argv || process.argv.slice(2);
	cwd = cwd || process.cwd();

	return parse(argv, cwd);
};
