var streams = helper.requireSource('streams');

var update = require('./_update.spec');
var dbdummy = require('./_db_dummy.spec');
var dblogged = require('./_db_logged.spec');

var createUpdateStream = function(options) {
	// We don't care about the log collection when performing update tests.
	var logCollection = helper.logDb.collection('mongopatch_test_log');
	return streams.logged.updateDummy(logCollection, helper.tmpCollection, options);
};

var createLoggedUpdateStream = function(logCollection, options) {
	return streams.logged.updateDummy(logCollection, helper.tmpCollection, options);
};

describe('streams.logged.dummy', function() {
	update(createUpdateStream);
	dbdummy(createUpdateStream);

	dblogged(createLoggedUpdateStream);
});
