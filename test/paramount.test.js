'use strict';

const paramount = require('../lib/paramount');
const assert = require('assert');

describe('paramount', function() {
  describe('require', function() {
    const testmodule = paramount.require('./testmodule', module);

    it('should require a module file and insert proxies for exported functions', function() {
      const result = testmodule.testmethod1({
        option1: 127,
        option2: 'hejsa',
        stuff: [1,2]
      }, ['a', 'b'], 1337, 'hovsa');
      assert.deepEqual(result, {
        sum: 127 + 1337,
        msg: 'hejsa' + 'hovsa',
        items: [1, 2, 'a', 'b']
      });
    });

    it('should throw an error on wrong argument types in main arguments', function() {
      assert.throws(function() {
        testmodule.testmethod1({
          option1: 127,
          option2: 'hejsa',
          stuff: [1,2]
        }, ['a', 'b'], 'notanumberlol', 'hovsa');
      }, 'function testmethod1 - invalid argument type for count, expected Number');
    });

    it('should throw an error on wrong argument types in sub-argument', function() {
      assert.throws(function() {
        testmodule.testmethod1({
          option1: 'notanumberlol',
          option2: 'hejsa',
          stuff: [1,2]
        }, ['a', 'b'], 1337, 'hovsa');
      }, /function testmethod1 - invalid argument type/);
    });

    it('should validate arguments for mangled docblock', function() {
      const result = testmodule.testmethod2({
          option1: 'notanumberlol', // Unknown validator
          option2: 'hejsa',
          stuff: [1,2]
        }, 
        ['a', 'b'],
        1337, // Also unknown
        'hovsa'
      );
      assert.deepEqual(result, {
        sum: 1337,
        items: [1, 2, 'a', 'b']
      });
    });    
  }); // End describe require

  describe('coalesceParams', function() {
    it('should organize properties under their parent parameters', function() {
      const result = paramount.coalesceParams([
       '{Object} [options] All your options',
       '{Number} [options.option1] Important number',
       '{String} [options.option2]',
       '{Array}  [options.stuff]',
       '{Array}  [items]',
       '{Number} [count]',
       '{String} [message]]'
      ].map(paramount.parseDocblockParam));
      assert.deepEqual(result, {
        options: {
          type: 'Object',
          name: 'options',
          property: false,
          desc: 'All your options',
          properties: [
            { type: 'Number', name: 'options', property: 'option1', desc: 'Important number' },
            { type: 'String', name: 'options', property: 'option2', desc: '' },
            { type: 'Array', name: 'options', property: 'stuff', desc: '' }
          ]
        },
        items: { type: 'Array', name: 'items', property: false, desc: '' },
        count: { type: 'Number', name: 'count', property: false, desc: '' },
        message: { type: 'String', name: 'message', property: false, desc: '' }
      });
    });

    it('should organize properties with errors', function() {
      const result = paramount.coalesceParams([
       '{Object} [options]',
       '{Unknown} [options.option1]',
       '{String} [invalid.option2]',
       '{Array}  [options.stuff]',
       '{Array}  [items]',
       '{Unknown} [count]',
       '{String} [message]'
      ].map(paramount.parseDocblockParam));
      assert.deepEqual(result, { 
        options: { 
          type: 'Object',
          name: 'options',
          property: false,
          desc: '',
          properties: [
            { type: 'Unknown', name: 'options', property: 'option1', desc: '' },
            { type: 'Array', name: 'options', property: 'stuff', desc: '' } 
          ] 
        },
        items: { type: 'Array', name: 'items', property: false, desc: '' },
        count: { type: 'Unknown', name: 'count', property: false, desc: '' },
        message: { type: 'String', name: 'message', property: false, desc: '' }
      });
    });
  }); // End describe coalesceParams

  describe('parseDocblockParam', function() {
    it('should parse a docblock param and return an object', function() {
      assert.deepEqual(paramount.parseDocblockParam('{String} [message] A message for you'), {
        type: 'String',
        name: 'message',
        desc: 'A message for you',
        property: false
      });
      assert.deepEqual(paramount.parseDocblockParam('{Number} [count]'), {
        type: 'Number',
        name: 'count',
        desc: '',
        property: false
      });
      assert.deepEqual(paramount.parseDocblockParam('{Number} [options.count]'), {
        type: 'Number',
        name: 'options',
        desc: '',
        property: 'count',
      });
      assert.deepEqual(paramount.parseDocblockParam('{Number} [options.count] A lotta stuff  '), {
        type: 'Number',
        name: 'options',
        desc: 'A lotta stuff',
        property: 'count',
      });
    });
  }); // End describe parseDocblockParam
}); // End describe paramount
