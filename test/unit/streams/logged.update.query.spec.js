var streams = helper.requireSource('streams');

var update = require('./_update.spec');
var dbupdate = require('./_db_update.spec');
var dblogged = require('./_db_logged.spec');
var dbupdatequery = require('./_db_update_query.spec');

var createUpdateStream = function(options) {
	// We don't care about the log collection when performing update tests.
	var logCollection = helper.logDb.collection('mongopatch_test_log');
	return streams.logged.updateUsingQuery(logCollection, options);
};

describe('streams.logged.update.query', function() {
	update(createUpdateStream);
	dbupdate(createUpdateStream);
	dbupdatequery(createUpdateStream);

	dblogged(streams.logged.updateUsingQuery);
});
