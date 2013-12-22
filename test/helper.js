var mongojs = require('mongojs');
var path = require('path');
var util = require('util');

var packageJson = require('../package');

var TEST_DB = 'mongopatch_test';
var TEST_LOG_DB = 'mongopatch_test_log';

var TEST_TMP_COLLECTION = '_mongopatch_test_tmp';
var TEST_LOG_COLLECTION = 'patch_test';

chai.Assertion.addChainableMethod('subset', function(expected) {
	var actual = this.__flags.object;

	var actualJson = JSON.stringify(actual);
	var expectedJson = JSON.stringify(expected);

	this.assert(
		sinon.match(expected).test(actual),
		util.format('expected %s to contain subset %s', actualJson, expectedJson),
		util.format('expected %s not to contain subset %s', actualJson, expectedJson),
		expected);
});

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

var copy = function(obj) {
	return JSON.parse(JSON.stringify(obj));
};

var initialize = function() {
	var db = mongojs(TEST_DB);
	var logDb = mongojs(TEST_LOG_DB);

	var that = {};

	var loadFixture = function(name, callback) {
		var fixturePath = path.join(__dirname, 'fixtures', name);
		var data = copy(require(fixturePath));

		var collection = db.collection(name);

		collection.remove(function(err) {
			if(err) {
				return callback(err);
			}

			collection.insert(data, function(err) {
				if(err) {
					return callback(err);
				}

				// Documents in data will have the _id property
				callback(null, data);
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
		stream.on('finish', function() {
			callback(null, buffer);
		});
	};

	var getLogCollection = function(callback) {
		var collection = logDb.collection(TEST_LOG_COLLECTION);

		collection.remove(function(err) {
			callback(err, err ? null : collection);
		});
	};

	that.pkg = packageJson;

	that.loadFixture = loadFixture;
	that.requireSource = requireSource;
	that.readStream = readStream;
	that.getLogCollection = getLogCollection;

	that.db = db;
	that.logDb = logDb;
	that.tmpCollection = db.collection(TEST_TMP_COLLECTION);

	return that;
};

module.exports = initialize();
