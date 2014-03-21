var fs = require('fs');
var path = require('path');
var util = require('util');

var xtend = require('xtend');
var camelize = require('camelize');
var optimist = require('optimist');

var OPTIONS = {
	config: {
		describe: 'Specify a JSON config file to use as defaults',
		type: 'string'
	},
	update: {
		describe: 'The update mode: dummy, query or document (see documentation for more details)',
		type: 'string',
		default: 'document'
	},
	'dry-run': {
		describe: 'Run patch without modifying data (same as --update dummy, overwrites --update option)',
		type: 'string'
	},
	db: {
		describe: 'Connection string for application database',
		type: 'string'
	},
	'log-db': {
		describe: 'Connection string for log database',
		type: 'string'
	},
	parallel: {
		describe: 'Specify a parallelism level for the patch. Defaults to 1',
		type: 'string'
	},
	output: {
		describe: 'Output progress while runing the patch',
		type: 'boolean',
		default: true
	},
	force: {
		describe: 'Force a run without providing a log db',
		type: 'boolean'
	},
	version: {
		describe: 'Prints version',
		type: 'boolean'
	}
};

var OPTION_KEYS = Object.keys(OPTIONS).reduce(function(acc, key) {
	acc[camelize(key)] = true;
	return acc;
}, {});

var cmd = optimist()
	.usage('Usage: $0 [patch] [options]')
	.options(OPTIONS);

var error = function(name) {
	var args = Array.prototype.slice.call(arguments, 1);
	return { option: name, message: util.format.apply(null, args) };
};

var version = function(argv) {
	var v = require('../../package').version;
	return util.format('mongopatch v%s', v);
};

var validate = function(patch, options) {
	if(!patch) {
		return error('patch', 'Patch path required');
	}
	if(!fs.existsSync(patch)) {
		return error('patch', 'Cannot find patch with path "%s"', patch);
	}

	var invalidOptions = Object.keys(options).filter(function(arg) {
		return !OPTION_KEYS.hasOwnProperty(arg);
	});

	if(invalidOptions.length) {
		var option = invalidOptions.shift();
		return error(option, 'Uknown option: %s', option);
	}

	if(!options.db) {
		return error('db', '--db option required');
	}
	if(!options.update) {
		return error('update', '--update option required');
	}

	if(['dummy', 'query', 'document'].indexOf(options.update) < 0) {
		return error('update', '--update option invalid');
	}

	if(options.update !== 'dummy' && !options.logDb && !options.force) {
		return error('logDb', '--log-db option required');
	}
};

var parse = function(argv) {
	var options = cmd.parse(argv);
	var patch = options._[0];

	patch = patch && path.resolve(process.cwd(), patch);

	delete options._;
	delete options.$0;

	options = camelize(options);

	options.dryRun = ('dryRun' in options) || options.update === 'dummy';
	if('parallel' in options) {
		options.parallel = parseInt(options.parallel, 10) || 10;
	}
	if(options.dryRun) {
		options.update = 'dummy';
	}

	var conf = options.config ? JSON.parse(fs.readFileSync(options.config, 'utf-8')) : {};
	options = xtend(camelize(conf), options);

	return {
		patch: patch,
		options: options,
		error: validate(patch, options),
		help: cmd.help,
		version: version
	};
};

module.exports = function(argv) {
	argv = argv || process.argv.slice(2);
	return parse(argv);
};
