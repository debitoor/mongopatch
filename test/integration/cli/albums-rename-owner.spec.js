var path = require('path');
var run = require('./_run');

var patch = path.join(__dirname, '../patches/albums-rename-owner.js');

describe('cli: albums rename owner to user', function() {
	run.test(patch);
});
