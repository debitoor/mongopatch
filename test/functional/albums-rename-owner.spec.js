var async = require('async');

var index = helper.requireSource('index');
var patch = require('./patches/albums-rename-owner');

var setup = function(options, callback) {
	var patches, albums, logCollection;

	async.waterfall([
		function(next) {
			helper.loadFixture('albums', next);
		},
		function(_, next) {
			var stream = index(patch, options);

			logCollection = stream.id;

			helper.readStream(stream, function(err, result) {
				patches = result;
				next(err);
			});
		},
		function(next) {
			helper.db.collection('albums').find({}, function(err, result) {
				albums = result;
				next(err);
			});
		},
		function() {
			callback(null, patches, albums, logCollection);
		}
	], callback);
};

var testPatches = function() {
	it('should have equal number of patches and albums', function() {
		chai.expect(this.patches.length).to.equal(this.albums.length);
	});

	it('should contain original document', function() {
		this.patches.forEach(function(patch) {
			chai.expect(patch)
				.to.have.property('document')
				.to.have.property('owner');
		});
	});

	it('should contain update document', function() {
		this.patches.forEach(function(patch) {
			chai.expect(patch)
				.to.have.property('updatedDocument')
				.to.have.property('user');
		});
	});

	it('should contain document diff', function() {
		this.patches.forEach(function(patch) {
			chai.expect(patch)
				.to.have.property('diff')
				.to.have.property('document')
				.to.deep.equal({ owner: 'removed', user: 'added' });
		});
	});
};

var testLogging = function() {
	it('should have equal number of patches and logged documents', function() {
		chai.expect(this.patches.length).to.equal(this.log.length);
	});

	it('should contain before document', function() {
		this.log.forEach(function(doc) {
			chai.expect(doc)
				.to.have.property('before')
				.to.have.property('owner');
		});
	});

	it('should contain modified', function() {
		this.log.forEach(function(doc) {
			chai.expect(doc).to.have.property('modified').to.be.true;
		});
	});

	it('should contain update document', function() {
		this.log.forEach(function(doc) {
			chai.expect(doc)
				.to.have.property('after')
				.to.have.property('user');
		});
	});

	it('should contain document diff', function() {
		this.log.forEach(function(doc) {
			chai.expect(doc)
				.to.have.property('diff')
				.to.deep.equal({ owner: 'removed', user: 'added' });
		});
	});
};

describe('rename albums owner to user', function() {
	describe('real update', function() {
		before(function(done) {
			var self = this;

			setup({ db: helper.db.toString() }, function(err, p, a) {
				self.patches = p;
				self.albums = a;
				done(err);
			});
		});

		testPatches();

		it('should contain accumulated diff', function() {
			this.patches.forEach(function(patch, i) {
				chai.expect(patch)
					.to.have.property('diff')
					.to.have.property('accumulated')
					.to.deep.equal({
						owner: { added: 0, removed: (i + 1), updated: 0 },
						user: { added: (i + 1), removed: 0, updated: 0 }
					});
			});
		});

		it('should have updated all documents in db', function() {
			this.albums.forEach(function(album) {
				chai.expect(album).to.contain.keys(['user', 'name', 'date', 'files']);
			});
		});
	});

	describe('real update with parallel', function() {
		before(function(done) {
			var self = this;

			setup({
				db: helper.db.toString(),
				parallel: 10
			}, function(err, patches, albums) {
				self.patches = patches;
				self.albums = albums;
				done(err);
			});
		});

		testPatches();

		it('should have updated all documents in db', function() {
			this.albums.forEach(function(album) {
				chai.expect(album).to.contain.keys(['user', 'name', 'date', 'files']);
			});
		});
	});

	describe('real update with log db', function() {
		before(function(done) {
			var self = this;

			setup({
				db: helper.db.toString(),
				logDb: helper.logDb.toString()
			}, function(err, patches, albums, logCollection) {
				self.patches = patches;
				self.albums = albums;
				self.logCollection = helper.logDb.collection(logCollection);

				done(err);
			});
		});

		before(function(done) {
			var self = this;

			this.logCollection.find({}, function(err, log) {
				self.log = log;
				done(err);
			});
		});

		testPatches();

		testLogging();

		it('should contain accumulated diff', function() {
			this.patches.forEach(function(patch, i) {
				chai.expect(patch)
					.to.have.property('diff')
					.to.have.property('accumulated')
					.to.deep.equal({
						owner: { added: 0, removed: (i + 1), updated: 0 },
						user: { added: (i + 1), removed: 0, updated: 0 }
					});
			});
		});

		it('should have updated all documents in db', function() {
			this.albums.forEach(function(album) {
				chai.expect(album).to.contain.keys(['user', 'name', 'date', 'files']);
			});
		});
	});

	describe('real update with parallel and log db', function() {
		before(function(done) {
			var self = this;

			setup({
				db: helper.db.toString(),
				logDb: helper.logDb.toString(),
				parallel: 10
			}, function(err, patches, albums, logCollection) {
				self.patches = patches;
				self.albums = albums;
				self.logCollection = helper.logDb.collection(logCollection);

				done(err);
			});
		});

		before(function(done) {
			var self = this;

			this.logCollection.find({}, function(err, log) {
				self.log = log;
				done(err);
			});
		});

		testPatches();

		testLogging();

		it('should have updated all documents in db', function() {
			this.albums.forEach(function(album) {
				chai.expect(album).to.contain.keys(['user', 'name', 'date', 'files']);
			});
		});
	});

	describe('dry run', function() {
		before(function(done) {
			var self = this;

			setup({
				db: helper.db.toString(),
				dryRun: true
			}, function(err, patches, albums) {
				self.patches = patches;
				self.albums = albums;
				done(err);
			});
		});

		testPatches();

		it('should contain accumulated diff', function() {
			this.patches.forEach(function(patch, i) {
				chai.expect(patch)
					.to.have.property('diff')
					.to.have.property('accumulated')
					.to.deep.equal({
						owner: { added: 0, removed: (i + 1), updated: 0 },
						user: { added: (i + 1), removed: 0, updated: 0 }
					});
			});
		});

		it('should not have updated all documents in db', function() {
			this.albums.forEach(function(album) {
				chai.expect(album).to.contain.keys(['owner', 'name', 'date', 'files']);
			});
		});
	});

	describe('dry run with parallel', function() {
		before(function(done) {
			var self = this;

			setup({
				db: helper.db.toString(),
				dryRun: true,
				parallel: 10
			}, function(err, patches, albums) {
				self.patches = patches;
				self.albums = albums;
				done(err);
			});
		});

		testPatches();

		it('should not have updated all documents in db', function() {
			this.albums.forEach(function(album) {
				chai.expect(album).to.contain.keys(['owner', 'name', 'date', 'files']);
			});
		});
	});

	describe('dry run with log db', function() {
		before(function(done) {
			var self = this;

			setup({
				db: helper.db.toString(),
				logDb: helper.logDb.toString(),
				dryRun: true
			}, function(err, patches, albums) {
				self.patches = patches;
				self.albums = albums;
				done(err);
			});
		});

		testPatches();

		testLogging();

		it('should contain accumulated diff', function() {
			this.patches.forEach(function(patch, i) {
				chai.expect(patch)
					.to.have.property('diff')
					.to.have.property('accumulated')
					.to.deep.equal({
						owner: { added: 0, removed: (i + 1), updated: 0 },
						user: { added: (i + 1), removed: 0, updated: 0 }
					});
			});
		});

		it('should not have updated all documents in db', function() {
			this.albums.forEach(function(album) {
				chai.expect(album).to.contain.keys(['owner', 'name', 'date', 'files']);
			});
		});
	});

	describe('dry run with parallel and log db', function() {
		before(function(done) {
			var self = this;

			setup({
				db: helper.db.toString(),
				logDb: helper.logDb.toString(),
				dryRun: true,
				parallel: 10
			}, function(err, patches, albums) {
				self.patches = patches;
				self.albums = albums;
				done(err);
			});
		});

		testPatches();

		testLogging();

		it('should not have updated all documents in db', function() {
			this.albums.forEach(function(album) {
				chai.expect(album).to.contain.keys(['owner', 'name', 'date', 'files']);
			});
		});
	});
});
