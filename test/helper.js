var mongojs = require('mongojs');
var path = require('path');

var TEST_DB = 'mongopatch_test';
//var TEST_LOG_DB = 'mongopatch_test_log';

var once = function(fn) {
	var called = false;

	return function() {
		if(called) {
			return;
		}

		called = true;
		fn.apply(null, arguments);
	};
};

var initialize = function(connect) {
	var db = mongojs(connect);
	var that = {};

	var loadFixture = function(name, callback) {
		var fixturePath = path.join(__dirname, 'fixtures', name);
		var data = require(fixturePath);

		var collection = db.collection(name);

		collection.remove(function(err) {
			if(err) {
				return callback(err);
			}

			collection.insert(data, function(err) {
				if(err) {
					return callback(err);
				}

				callback();
			});
		});
	};

	var requireSource = function(module) {
		return require(path.join(__dirname, '..', 'source', module));
	};

	var readStream = function(stream, callback) {
		callback = once(callback);
		var buffer = [];

		stream.on('data', function(obj) {
			buffer.push(obj);
		});
		stream.on('close', function() {
			callback(new Error('Stream closed'));
		});
		stream.on('error', function(err) {
			callback(err);
		});
		stream.on('end', function() {
			callback(null, buffer);
		});
	};

	that.loadFixture = loadFixture;
	that.requireSource = requireSource;
	that.readStream = readStream;
	that.db = db;

	return that;
};

module.exports = initialize(TEST_DB);
