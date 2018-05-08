var util = require('util');
var tty = require('tty');

var stream = require('stream-wrapper');
var noansi = require('ansi-stripper');

require('colors');

// Is stdout a tty
var isTty = tty.isatty(1);
var noopCallback = function(callback) {
	if (callback) {
		callback();
	}
};

var PROGRESS_BAR_LENGTH = 50;
var TABLE_CELL_PADDING = 2;
var OUTPUT_PADDING = 10;

var error = function(err) {
	console.error((err.message || err).red);

	if (err.patch) {
		var patch = err.patch;

		console.error(JSON.stringify({
			modified: patch.modified,
			before: patch.before,
			after: patch.after,
			modifier: patch.modifier,
			diff: patch.diff
		}, null, 4));
	}
	if (err.stack) {
		console.error(err.stack);
	}
};

var cursor = function() {
	var ttyCursor = {
		hide: function(callback) {
			process.stdout.write('\x1B[?25l', callback);
		},
		show: function(callback) {
			process.stdout.write('\x1B[?25h', callback);
		}
	};

	var noopCursor = {
		hide: noopCallback,
		show: noopCallback
	};

	return isTty ? ttyCursor : noopCursor;
};

var bar = function(percent) {
	percent = Math.min(percent, 100);

	var bar = '';
	var limit = Math.floor(percent / 100 * PROGRESS_BAR_LENGTH);
	var i;

	for (i = 0; i < limit; i++) {
		bar += '=';
	}
	if (limit < PROGRESS_BAR_LENGTH) {
		bar += '>';
		limit++;
	}
	for (i = limit; i < PROGRESS_BAR_LENGTH; i++) {
		bar += ' ';
	}

	return '[' + bar.bold.cyan + ']';
};

var table = function(table) {
	var columnLengths = [];

	var each = function(fn) {
		for (var i = 0; i < table.length; i++) {
			var row = table[i];

			for (var j = 0; j < row.length; j++) {
				fn(i, j, row[j]);
			}
		}
	};
	var padding = function(padding) {
		var result = '';

		for (var i = 0; i < padding; i++) {
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
		if (n < 10) {
			return '0' + n;
		}

		return n;
	};

	return pad(hours) + 'h ' + pad(minutes) + 'm ' + pad(seconds) + 's';
};

var sign = function(number) {
	if (!number) {
		return ' 0';
	}

	return number < 0 ? number.toString() : ('+' + number);
};

var capture = function(delta) {
	var current = Number.MIN_VALUE;

	return function(v) {
		if (Math.abs(current - v) > delta) {
			current = v;
			return v;
		}

		return current;
	};
};

var progress = function(patchId) {
	var output = [];
	var eta = capture(30);
	var speed = capture(10);

	var outputProgress = function(progress) {
		output.push('Progress:     '.grey + bar(progress.percentage) + '  ' + progress.count + '/' + progress.total + '  ' + progress.percentage.toFixed(1) + '%');
		output.push('Patch:        '.grey + patchId);
	};

	var outputStats = function(progress) {
		var summary = table([
			['Summary:'.grey, 'Time', time(progress.time)],
			['', 'ETA', time(eta(progress.eta)), util.format('(speed %s)', Math.round(speed(progress.speed)))],
			['', 'Modified', progress.modified, util.format('(rest %s)', progress.count - progress.modified)],
			['', 'Skipped', progress.skipped]
		]);

		Array.prototype.push.apply(output, summary);
	};

	var outputDiff = function(progress) {
		var diff = progress.diff;

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

	var outputInterface = function(progress) {
		output = [];

		outputProgress(progress);

		output.push('');

		outputStats(progress);
		outputDiff(progress);
	};

	var formatOutput = function() {
		return output.join('\n');
	};

	var formatDone = function() {
		return '\n              DONE'.green;
	};

	var ttyProgress = function() {
		outputProgress({ count: 0, total: 0, percentage: 0 });
		console.log(formatOutput());

		return stream.transform({ objectMode: true }, function(patch, enc, callback) {
			process.stdout.moveCursor(0, -output.length);
			outputInterface(patch.progress);

			if (output.length > process.stdout.rows - OUTPUT_PADDING) {
				output = output.slice(0, process.stdout.rows - OUTPUT_PADDING);
				output.push('              ...');
			}

			console.log(formatOutput());

			callback(null, patch);
		}, function(callback) {
			console.log(formatDone());
			callback();
		});
	};

	var endProgress = function() {
		var last;

		return stream.transform({ objectMode: true }, function(patch, enc, callback) {
			last = patch;
			callback(null, patch);
		}, function(callback) {
			if (last) {
				outputInterface(last.progress);

				console.log(noansi(formatOutput()));
				console.log(noansi(formatDone()));
			}

			callback();
		});
	};

	return isTty ? ttyProgress() : endProgress();
};

exports.cursor = cursor();
exports.error = error;
exports.progress = progress;
