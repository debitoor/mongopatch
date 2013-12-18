#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var xtend = require('xtend');
var camelize = require('camelize');
var util = require('util');

require('colors');

var optimist = require('optimist')
	.usage('Usage: $0 [patch] [options]')
	.string('config')
	.describe('config', 'Specify a JSON config file to use as defaults')
	.string('dry-run')
	.describe('dry-run', 'Run patch without modifying data')
	.string('db')
	.demand('db')
	.describe('db', 'Connection string for application database')
	.string('log-db')
	.describe('log-db', 'Connection string for log database')
	.string('parallel')
	.describe('parallel', 'Specify a parallelism level for the patch. Defaults to 1')
	.string('force')
	.describe('force', 'Force a run without providing a log db')
	.boolean('version')
	.describe('version', 'Prints version');

var version = function() {
	if (process.argv.indexOf('--version') < 0) {
		return;
	}

	var v = require('../package').version;
	console.log('mongopatch v' + v);
	error('');
};

var exit = function(code) {
	process.stdout.write('\x1B[?25h', function() {
		process.exit(code || 0);
	});
};

var error = function(err) {
	console.error((err.message || err).red);

	if(err.patch) {
		var patch = err.patch;
		var modified = !!(patch.diff && Object.keys(patch.diff.document).length);

		console.log(JSON.stringify({
			modified: modified,
			before: patch.document,
			after: patch.updatedDocument,
			modifier: patch.modifier,
			diff: patch.diff && patch.diff.document
		}, null, 4));
	}
	if(err.stack) {
		console.log(err.stack);
	}

	exit(1);
};

var apply = function(patch, options) {
	if(!patch) {
		optimist.showHelp();
		return error('Patch path required');
	}

	patch = path.join(process.cwd(), patch);

	if(!fs.existsSync(patch)) {
		return error(util.format('Patch "%s" does not exist', patch));
	}

	var conf = options.config ? JSON.parse(fs.readFileSync(options.config, 'utf-8')) : {};
	options = xtend(options, camelize(conf));

	if(!options.dryRun && !options.logDb && !options.force) {
		error('--log-db required to run patch');
	}
	if (options.parallel === true) {
		options.parallel = 10;
	}

	patch = require(patch);

	var run = require('../source/index');
	var stream = run(patch, options);

	process.stdout.write('\x1B[?25l');
	process.on('SIGINT', exit.bind(null, 0));

	stream.on('error', error);
	stream.on('end', function() {
		process.stdout.write('\x1B[?25h');
	});
};

process.on('uncaughtException', function(err) {
	error(err);
});

version();

var argv = optimist.argv;
var opts = Object.keys(argv).reduce(function(res, key) {
	res[camelize(key)] = argv[key];
	return res;
}, {});

apply(argv._[0], opts);
