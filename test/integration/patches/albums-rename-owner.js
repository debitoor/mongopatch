var helper = require('../../helper'); // jshint ignore:line

module.exports = function(patch) {
	patch.version(helper.pkg.version);

	patch.update('albums', function(document, callback) {
		callback(null, { $rename: { owner: 'user' } });
	});
};
