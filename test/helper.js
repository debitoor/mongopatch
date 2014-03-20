var path = require('path');
var fs = require('fs');

var mongojs = require('mongojs');
var once = require('once');
var async = require('async');

var packageJson = require('../package');

var TEST_DB = 'mongopatch_test';
var TEST_LOG_DB = 'mongopatch_test_log';

var TEST_TMP_COLLECTION = '_mongopatch_test_tmp';
var TEST_LOG_COLLECTION = 'patch_test';

var initialize = function() {
	var db = mongojs(TEST_DB);
	var logDb = mongojs(TEST_LOG_DB);

	var that = {};

	var copyJSON = function(obj) {
		return JSON.parse(JSON.stringify(obj));
	};

	var requireSource = function(module) {
		return require(path.join(__dirname, '..', 'source', module));
	};

	var env = function(name) {
		name = 'MONGOPATCH_TEST_' + name.toUpperCase();
		return process.env[name];
	};

	var loadFixture = function(name, callback) {
		var fixturePath = path.join(__dirname, 'fixtures', name);
		var data = copyJSON(require(fixturePath));

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

	var loadAllFixtures = function(callback) {
		var fixturesPath = path.join(__dirname, 'fixtures');

		fs.readdir(fixturesPath, function(err, files) {
			if(err) {
				return callback(err);
			}

			files = files.reduce(function(acc, file) {
				if(!/\.js$/.test(file)) {
					return acc;
				}

				file = file.replace(/\.js$/, '');

				acc[file] = function(next) {
					loadFixture(file, next);
				};

				return acc;
			}, {});

			async.parallel(files, callback);
		});
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

	that.copyJSON = copyJSON;
	that.requireSource = requireSource;
	that.env = env;

	that.loadFixture = loadFixture;
	that.loadAllFixtures = loadAllFixtures;
	that.readStream = readStream;
	that.getLogCollection = getLogCollection;

	that.db = db;
	that.logDb = logDb;
	that.tmpCollection = db.collection(TEST_TMP_COLLECTION);

	return that;
};

module.exports = initialize();
