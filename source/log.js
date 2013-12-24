var util = require('util');

var stream = require('stream-wrapper');
var noansi = require('ansi-stripper');

require('colors');

var PROGRESS_BAR_LENGTH = 50;
var TABLE_CELL_PADDING = 2;
var OUTPUT_PADDING = 10;

var bar = function(percent) {
	percent = Math.min(percent, 100);

	var bar = '';
	var limit = Math.floor(percent / 100 * PROGRESS_BAR_LENGTH);
	var i;

	for(i = 0; i < limit; i++) {
		bar += '=';
	}
	if(limit < PROGRESS_BAR_LENGTH) {
		bar += '>';
		limit++;
	}
	for(i = limit; i < PROGRESS_BAR_LENGTH; i++) {
		bar += ' ';
	}

	return '[' + bar.bold.cyan + ']';
};

var table = function(table) {
	var columnLengths = [];

	var each = function(fn) {
		for(var i = 0; i < table.length; i++) {
			var row = table[i];

			for(var j = 0; j < row.length; j++) {
				fn(i, j, row[j]);
			}
		}
	};
	var padding = function(padding) {
		var result = '';

		for(var i = 0; i < padding; i++) {
			result += ' ';
		}

		return result;
	};
	var length = function(obj) {
		return noansi(obj.toString()).length;
	};

	each(function(i, j, value) {
		columnLengths[j] = Math.max(columnLengths[j] || 0, length(value));
	});

	each(function(i, j, value) {
		table[i][j] = value + padding(columnLengths[j] - length(value) + TABLE_CELL_PADDING);
	});

	return table.map(function(row) {
		return row.join(padding(TABLE_CELL_PADDING * 2));
	});
};

var time = function(time) {
	var hours = Math.floor(time / 3600);
	var minutes = Math.floor((time - (hours * 3600)) / 60);
	var seconds = Math.floor(time - (hours * 3600) - (minutes * 60));

	var pad = function(n) {
		if(n < 10) {
			return '0' + n;
		}

		return n;
	};

	return pad(hours) + 'h ' + pad(minutes) + 'm ' + pad(seconds) + 's';
};

var sign = function(number) {
	if(!number) {
		return ' 0';
	}

	return number < 0 ? number.toString() : ('+' + number);
};

var capture = function(delta) {
	var current = Number.MIN_VALUE;

	return function(v) {
		if(Math.abs(current - v) > delta) {
			current = v;
			return v;
		}

		return current;
	};
};

var progress = function(options) {
	var output = [];
	var eta = capture(30);
	var speed = capture(10);

	var outputProgress = function(output, count, total, progress) {
		output.push('Progress:     '.grey + bar(progress) + '  ' + count + '/' + total + '  ' + progress.toFixed(1) + '%');
		output.push('Patch:        '.grey + options.patch);
	};

	var outputDiff = function(output, diff) {
		diff = Object.keys(diff || {}).map(function(key) {
			return [
				key,
				sign(diff[key].added).green,
				diff[key].updated.toString().yellow,
				sign(-diff[key].removed).red
			];
		});

		diff = diff.length ? diff : [[ '(No changes)' ]];
		diff.forEach(function(row) {
			row.unshift('');
		});

		diff.unshift(['Diff:   '.grey, '', 'added'.grey, 'updated'.grey, 'removed'.grey]);
		Array.prototype.push.apply(output, table(diff));
	};

	var outputStats = function(output, modified, count, t, e, s) {
		var summary = table([
			['Summary:'.grey, 'Time', time(t)],
			['', 'ETA', time(eta(e)), util.format('(speed %s)', Math.round(speed(s)))],
			['', 'Modified', modified, util.format('(rest %s)', count - modified)]
		]);

		Array.prototype.push.apply(output, summary);
	};

	var logOutput = function(output) {
		console.log(output.join('\n'));
	};

	outputProgress(output, 0, 0, options.total === 0 ? 100 : 0);
	logOutput(output);

	return stream.transform({ objectMode: true }, function(patch, enc, callback) {
		var progress = patch.progress;

		process.stdout.moveCursor(0, -output.length);
		output = [];

		outputProgress(output, progress.count, progress.total, progress.percentage);

		output.push('');

		outputStats(output, progress.modified, progress.count, progress.time, progress.eta, progress.speed);
		outputDiff(output, progress.diff);

		if(output.length > process.stdout.rows - OUTPUT_PADDING) {
			output = output.slice(0, process.stdout.rows - OUTPUT_PADDING);
			output.push('              ...');
		}

		logOutput(output);

		callback(null, patch);
	}, function(callback) {
		console.log('\n              DONE'.green);
		callback();
	});
};

module.exports = progress;
