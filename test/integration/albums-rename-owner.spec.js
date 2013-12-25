var patch = require('./patches/albums-rename-owner');
var run = require('./_run');

describe('albums rename owner to user', function() {
	run.test(patch);
});
