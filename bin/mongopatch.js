#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var xtend = require('xtend');
var camelize = require('camelize');

require('colors');

var optimist = require('optimist')
	.usage('Usage: $0 [patch]')
	.string('config')
	.describe('config', 'Specify a JSON config file to use as defaults')
	.string('dry-run')
	.describe('dry-run', 'Run patch without modifying data')
	.boolean('diff')
	.default('diff', true)
	.describe('diff', 'Output accumulated diff')
	.string('db')
	.demand('db')
	.describe('db', 'Connection string for application database')
	.string('log-db')
	.describe('log-db', 'Connection string for log database')
	.string('parallel')
	.describe('parallel', 'Specify a parallelism level for the patch. Defaults to 1')
	.string('force')
	.describe('force', 'Force a run without providing a log db')

var argv = optimist.argv;

var error = function(err) {
	console.error((err.message || err).red);
	process.exit(1);
};

var apply = function(patch, options) {
	if(!patch || patch === 'help') {
		return error('');
	}

	patch = path.join(process.cwd(), patch);

	if(!fs.existsSync(patch)) {
		return error('Patch: '+patch+' does not exist');
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
	process.on('SIGINT', function() {
		process.stdout.write('\x1B[?25h', function() {
			process.exit(0);
		});
	});

	stream.on('end', function() {
		process.stdout.write('\x1B[?25h');
	});
	stream.on('error', error);
};

apply(argv._[0], camelize(argv));
