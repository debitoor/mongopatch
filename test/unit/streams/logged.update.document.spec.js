var streams = helper.requireSource('streams');

var update = require('./_update.spec');
var dbupdate = require('./_db_update.spec');
var dbupdatedocument = require('./_db_update_document.spec');
var dblogged = require('./_db_logged.spec');

var createUpdateStream = function(options) {
	// We don't care about the worker and log collection when performing update tests.
	var logCollection = helper.logDb.collection('mongopatch_test_log');
	var worker = function(document, callback) {
		callback(null, document);
	};

	return streams.logged.updateUsingDocument(logCollection, worker, options);
};

var createLoggedUpdateStream = function(logCollection, options) {
	// We don't care about the worker when performing logged update tests.
	var worker = function(document, callback) {
		callback(null, document);
	};

	return streams.logged.updateUsingDocument(logCollection, worker, options);
};

var createDocumentUpdateStream = function(worker, options) {
	// We don't care about the log collection when performing update tests.
	var logCollection = helper.logDb.collection('mongopatch_test_log');

	return streams.logged.updateUsingDocument(logCollection, worker, options);
};

describe('streams.logged.update.document', function() {
	update(createUpdateStream);
	dbupdate(createUpdateStream);

	dbupdatedocument(createDocumentUpdateStream);

	dblogged(createLoggedUpdateStream);
});
