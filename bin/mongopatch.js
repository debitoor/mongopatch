#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var xtend = require('xtend');
var camelize = require('camelize');

var optimist = require('optimist')
	.usage('Usage: $0 [patch]')
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
	.describe('parallel', 'Specify a parallelism level for the patch. Defaults to 1');

var argv = optimist.argv;

var error = function(msg) {
	console.error(msg);
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

	if (options.parallel === true) {
		options.parallel = 10;
	}

	patch = require(patch);

	var mongopatch = require('../source/index');
	var stream = mongopatch(patch, options);

	process.stdout.write('\x1B[?25l');
	process.on('SIGINT', function() {
		process.stdout.write('\x1B[?25h', function() {
			process.exit(0);
		});
	});

	stream.on('end', function() {
		process.stdout.write('\x1B[?25h');
	});
};

apply(argv._[0], camelize(argv));
