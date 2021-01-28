const sinon = require("sinon");
const sinonChai = require("sinon-chai");
const chai = require("chai");
chai.use(sinonChai);

global.sinon = sinon;
global.expect = chai.expect;
