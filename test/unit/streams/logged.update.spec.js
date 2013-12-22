var streams = helper.requireSource('streams');

var update = require('./_update.spec');
var dbupdate = require('./_db_update.spec');
var dblogged = require('./_db_logged.spec');

var createUpdateStream = function(options) {
	// We don't care about the log collection, when performing update tests.
	var logCollection = helper.logDb.collection('patch_test');
	return streams.logged.update(logCollection, options);
};

describe('streams.logged.update', function() {
	update(createUpdateStream);
	dbupdate(createUpdateStream);
	dblogged(streams.logged.update);
});
