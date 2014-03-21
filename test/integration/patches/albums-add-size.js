var helper = require('../../helper'); // jshint ignore:line

module.exports = function(patch) {
	patch.version(helper.pkg.version);

	patch.update('albums', function(document, callback) {
		var size = document.files.reduce(function(acc, file) {
			return acc + file.size;
		}, 0);

		callback(null, { $set: { size: size } });
	});

	patch.after(function(update, callback) {
		if(!update.after.size) {
			return callback(new Error('Size zero or missing'));
		}

		callback();
	});
};
