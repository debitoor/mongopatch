var patch = require('./patches/albums-add-size');
var run = require('./_run');

describe('albums add total size (error)', function() {
	run.error(patch);
});
