/*jshint -W079 */
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

var sinon = require('sinon');
var chai = require('chai');

require('mocha');

global.sinon = sinon;
global.chai = chai;

global.helper = require('./helper');

chai.Assertion.includeStack = true;
chai.use(require('sinon-chai'));
