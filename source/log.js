var async = require('async');
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
	time = time / 1000;

	var hours = Math.floor(time / 3600);
	var minutes = Math.floor((time - (hours * 3600)) / 60);
	var seconds = Math.floor(time - (hours * 3600) - (minutes * 60));

	return hours + 'h ' + minutes + 'm ' + seconds + 's';
};

var sign = function(number) {
	if(!number) {
		return ' 0';
	}

	return number < 0 ? number.toString() : ('+' + number);
};

var progress = function(count, log) {
	var current = 0;
	var output = [];
	var started = Date.now();

	var logProgress = function(current, progress, diff) {
		var hasDiff = diff;

		process.stdout.moveCursor(0, -output.length);

		diff = Object.keys(diff || {}).map(function(key) {
			return [key, sign(diff[key].added).green, diff[key].updated.toString().yellow, sign(-diff[key].removed).red];
		});

		diff = diff.length ? diff : [[ '(No changes)' ]];
		diff.forEach(function(row) {
			row.unshift('');
		});

		diff[0][0] = 'Diff:   '.grey;

		output = hasDiff ? table(diff) : [];
		output.unshift('Patch:        '.grey + log.collection);
		output.unshift('Progress:     '.grey + bar(progress) + '  ' + current + '/' + count + '  ' + progress.toFixed(1) + '%');

		if(output.length > process.stdout.rows - OUTPUT_PADDING) {
			output = output.slice(0, process.stdout.rows - OUTPUT_PADDING);
			output.push('              ...');
		}

		console.log(output.join('\n'));
	};

	logProgress(0, !count ? 100 : 0);

	return stream.transform({ objectMode: true }, function(patch, enc, callback) {
		var progress = 100 * (++current) / count;

		logProgress(current, progress, patch.diff.accumulated);
		callback(null, patch);
	}, function(callback) {
		stats(log, Date.now() - started, callback);
	});
};

var stats = function(log, t, callback) {
	var count = function(query) {
		return function(callback) {
			if(!log.db) {
				return callback(null, 0);
			}

			log.db.collection(log.collection).count(query || {}, callback);
		};
	};

	async.parallel({
		modified: count({ modified: true }),
		total: count()
	}, function(err, results) {
		if(err){
			return callback(err);
		}

		console.log('');

		table([
			['Summary:'.grey, 'Time', time(t)],
			['', 'Modified', results.modified, '(rest ' + (results.total - results.modified) + ')'],
			['', 'Total', results.total]
		]).forEach(function(line) {
			console.log(line);
		});

		console.log('');

		return callback();
	});
};

module.exports = progress;
