var streams = helper.requireSource('streams');

var update = require('./_update.spec');
var dbdummy = require('./_db_dummy.spec');

var createUpdateStream = function(options) {
	return streams.updateDummy(helper.tmpCollection, options);
};

describe('streams.dummy', function() {
	update(createUpdateStream);
	dbdummy(createUpdateStream);
});
