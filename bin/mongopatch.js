#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var xtend = require('xtend');
var camelize = require('camelize');
var util = require('util');

require('colors');

// Every option defined in optimist should also be present in OPTIONS
var OPTIONS = ['config', 'dry-run', 'db', 'log-db', 'parallel', 'output', 'force', 'version'];

var optimist = require('optimist')
	.usage('Usage: $0 [patch] [options]')
	.string('config')
	.describe('config', 'Specify a JSON config file to use as defaults')
	.string('dry-run')
	.describe('dry-run', 'Run patch without modifying data')
	.string('db')
	.describe('db', 'Connection string for application database')
	.string('log-db')
	.describe('log-db', 'Connection string for log database')
	.string('parallel')
	.describe('parallel', 'Specify a parallelism level for the patch. Defaults to 1')
	.boolean('output')
	.describe('output', 'Output progress while runing the patch')
	.default('output', true)
	.string('force')
	.describe('force', 'Force a run without providing a log db')
	.boolean('version')
	.describe('version', 'Prints version')
	.check(function checkOptions(argv) {
		var invalid = Object.keys(argv).filter(function(arg) {
			return arg !== '_' && arg !== '$0' && OPTIONS.indexOf(arg) === -1;
		});

		checkOptions.toString = function() {
			var message = invalid.map(function(arg) {
				return util.format('"%s"', arg);
			}).join(', ');

			return util.format('unknown arguments %s', message);
		};

		return !invalid.length;
	});

var version = function() {
	if (process.argv.indexOf('--version') < 0) {
		return;
	}

	var v = require('../package').version;
	console.log('mongopatch v' + v);
	process.exit();
};

var exit = function(code) {
	process.stdout.write('\x1B[?25h', function() {
		process.exit(code || 0);
	});
};

var error = function(err) {
	console.error((err.message || err).red);

	if(err.stack) {
		console.error(err.stack);
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

	options.dryRun = ('dryRun' in options);
	if('parallel' in options) {
		options.parallel = parseInt(options.parallel, 10) || 10;
	}

	var conf = options.config ? JSON.parse(fs.readFileSync(options.config, 'utf-8')) : {};
	options = xtend(camelize(conf), options);

	if(!options.db) {
		return error('--db required to run patch');
	}
	if(!options.dryRun && !options.logDb && !options.force) {
		return error('--log-db required to run patch');
	}

	patch = require(patch);

	var run = require('../source/index');
	var stream = run(patch, options);

	process.stdout.write('\x1B[?25l');
	process.on('SIGINT', exit.bind(null, 0));

	stream.on('end', function() {
		process.stdout.write('\x1B[?25h');
	});
};

process.on('uncaughtException', function(err) {
	error(err);
});

version();

var argv = optimist.argv;
var opts = camelize(argv);

delete opts[''];
delete opts.$0;

apply(argv._[0], opts);
