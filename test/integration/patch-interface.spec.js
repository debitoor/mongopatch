var index = helper.requireSource('index');

describe('patch interface', function () {
	it('should provide logDb instance', function (done) {
		var testPatch = function (patch) {
			expect(patch.logDb).to.be.ok;
			expect(patch.logDb).to.be.a('object');

			patch.version(helper.pkg.version);
			patch.update('albums', function (document, callback) {
				callback(null, {});
			});

		};
		var stream = index(testPatch, {db: helper.db.toString(), logDb: helper.logDb.toString(), update: 'query'});

		helper.readStream(stream, done);
	});
});