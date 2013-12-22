var streams = helper.requireSource('streams');

var update = require('./_update.spec');
var dbtmp = require('./_db_tmp.spec');
var dblogged = require('./_db_logged.spec');

var createUpdateStream = function(options) {
	// We don't care  about the log collection, when performing update tests.
	var logCollection = helper.logDb.collection('patch_test');
	return streams.logged.tmp(logCollection, helper.tmpCollection, options);
};

describe('streams.logged.tmp', function() {
	update(createUpdateStream);
	dbtmp(createUpdateStream);

	dblogged(function(logCollection, options) {
		return streams.logged.tmp(logCollection, helper.tmpCollection, options);
	});
});
