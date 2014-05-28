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

	var loadFixture = function(name, options, callback) {
		if(!callback) {
			callback = options;
			options = {};
		}

		var fixturePath = path.join(__dirname, 'fixtures', name);
		var data = require(fixturePath);
		data = options.copy === false ? data : copyJSON(data);

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
		stream.on('end', function() {
			callback(null, buffer);
		});
	};

	var getLogCollection = function(callback) {
		var collection = logDb.collection(TEST_LOG_COLLECTION);

		collection.remove(function(err) {
			callback(err, err ? null : collection);
		});
	};

	var delayCollection = function(collection) {
		var Collection = function() {
			var self = this;

			['findAndModify', 'update', 'save', 'insert', 'remove'].forEach(function(method) {
				self[method] = function() {
					var args = arguments;
					var listener = this['on' + method.toLowerCase()];

					var fn = function() {
						collection[method].apply(collection, args);
					};

					if(!listener) {
						return fn();
					}

					setImmediate(function() {
						listener(fn);
					});
				};
			});
		};

		Collection.prototype = collection;

		return new Collection();
	};

	that.pkg = packageJson;

	that.copyJSON = copyJSON;
	that.requireSource = requireSource;

	that.loadFixture = loadFixture;
	that.loadAllFixtures = loadAllFixtures;
	that.readStream = readStream;
	that.getLogCollection = getLogCollection;
	that.delayCollection = delayCollection;

	that.db = db;
	that.logDb = logDb;
	that.tmpCollection = db.collection(TEST_TMP_COLLECTION);

	return that;
};

module.exports = initialize();
