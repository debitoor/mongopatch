var helper = require('../../helper'); // jshint ignore:line

module.exports = function(patch) {
	patch.version(helper.pkg.version);

	patch.setup(function(callback) {
		helper.loadAllFixtures(callback);
	});

	patch.update('users', { albums: { $exists: false } }, function(document, callback) {
		patch.db.collection('albums').count({ owner: document.name }, function(err, count) {
			callback(err, { $set: { albums: count } });
		});
	});

	patch.teardown(function(stats, callback) {
		helper.db.close();
		helper.logDb.close();

		callback();
	});
};
