/*jshint -W079 */
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
var sinon = require('sinon');
global.sinon = sinon;
var chai = require('chai');
global.chai = chai;
chai.Assertion.includeStack = true;
chai.use(require('sinon-chai'));