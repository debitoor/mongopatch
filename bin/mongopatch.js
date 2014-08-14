#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var util = require('util');

var mongopatch = require('../source/index');
var input = require('../source/cli/in');
var output = require('../source/cli/out');

require('colors');

var exit = function(code) {
	output.cursor.show(function() {
		process.exit(code || 0);
	});
};

var version = function() {
	var v = require('../package.json').version;
	return util.format('mongopatch v%s', v);
};

var help = function() {
	return fs.readFileSync(path.join(__dirname, 'help.txt'), 'utf-8');
};

process.on('uncaughtException', function(err) {
	output.error(err);
	exit(1);
});

var apply = function() {
	var cmd = input();

	if(cmd.options.version) {
		return console.log(version());
	}
	if(cmd.error) {
		output.error(cmd.error);
		console.error(help());
		return exit(1);
	}

	var patch = require(cmd.patch);
	var fn = patch;

	if(cmd.options.setup) {
		var setup = require(cmd.options.setup);

		if(typeof setup === 'function') {
			fn = function(p) {
				setup(p);
				patch(p);
			};
		}
	}

	var stream = mongopatch(fn, cmd.options);

	output.cursor.hide();

	process.on('SIGINT', exit.bind(null, 0));

	if(cmd.options.output) {
		var progressStream = stream.pipe(output.progress(stream.id));

		stream.on('error', function(err) {
			progressStream.emit('error', err);
		});

		progressStream.on('error', function(err) {
			output.error(err);
			exit(1);
		});

		stream = progressStream;
	}

	stream.on('end', output.cursor.show);
	stream.resume();
};

apply();
