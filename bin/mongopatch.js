#!/usr/bin/env node
var mongopatch = require('../source/index');
var input = require('../source/cli/in');
var output = require('../source/cli/out');

require('colors');

var hideCursor = function(callback) {
	process.stdout.write('\x1B[?25l', callback);
};

var showCursor = function(callback) {
	process.stdout.write('\x1B[?25h', callback);
};

var exit = function(code) {
	showCursor(function() {
		process.exit(code || 0);
	});
};

process.on('uncaughtException', function(err) {
	output.error(err);
	exit(1);
});

var apply = function() {
	var cmd = input();

	if(cmd.options.version) {
		return console.log(cmd.version());
	}
	if(cmd.error) {
		output.error(cmd.error);
		console.error(cmd.help());
		return exit(1);
	}

	var patch = require(cmd.patch);
	var stream = mongopatch(patch, cmd.options);

	hideCursor();

	process.on('SIGINT', exit.bind(null, 0));

	if(cmd.options.output) {
		stream = stream.pipe(output(stream.id));
		stream.on('error', function(err) {
			output.error(err);
			exit(1);
		});
	}

	stream.on('end', showCursor);
	stream.resume();
};

apply();
