var streams = helper.requireSource('streams');

var update = require('./_update.spec');
var dbupdate = require('./_db_update.spec');
var dbupdatedocument = require('./_db_update_document.spec');

var createUpdateStream = function(options) {
	// We don't care about the worker when performing update tests.
	var worker = function(document, callback) {
		callback(null, document);
	};

	return streams.updateUsingDocument(worker, options);
};

describe('streams.update.document', function() {
	update(createUpdateStream);
	dbupdate(createUpdateStream);

	dbupdatedocument(streams.updateUsingDocument);
});
