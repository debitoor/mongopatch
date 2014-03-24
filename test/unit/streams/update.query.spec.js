var streams = helper.requireSource('streams');

var update = require('./_update.spec');
var dbupdate = require('./_db_update.spec');
var dbupdatequery = require('./_db_update_query.spec');

describe('streams.update.query', function() {
	update(streams.updateUsingQuery);
	dbupdate(streams.updateUsingQuery);
	dbupdatequery(streams.updateUsingQuery);
});
