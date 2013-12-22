var streams = helper.requireSource('streams');

var update = require('./_update.spec');
var dbtmp = require('./_db_tmp.spec');

var createUpdateStream = function(options) {
	return streams.tmp(helper.tmpCollection, options);
};

describe('streams.tmp', function() {
	update(createUpdateStream);
	dbtmp(createUpdateStream);
});
