var path = require('path');
var run = require('./_run');

var patch = path.join(__dirname, '../patches/albums-add-size.js');

describe('cli: albums add total size (error)', function() {
	run.error(patch);
});
