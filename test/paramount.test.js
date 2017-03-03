'use strict';

const paramount = require('../lib/paramount');
const assert = require('assert');

describe('paramount', function() {
  describe('require', function() {
    const testmodule = paramount.require('./testmodule', module);

    it('should throw an error on requiring a non-existing module', function() {
      assert.throws(function() {
        paramount.require('./testmoduleXXX', module);
      }, /Cannot find module '.\/testmoduleXXX'/);
    });

    it('should throw an error if filepath is not supplied', function() {
      assert.throws(function() {
        paramount.require(null, module);
      }, /Filepath not defined/);
    });

    it('should throw an error if module not supplied', function() {
      assert.throws(function() {
        paramount.require('./testmodule');
      }, /Module not defined/);
    });

    it('should throw an error if a parameter is defined more than once', function() {
      assert.throws(function() {
        paramount.require('./testmodule2', module);
      }, /Duplicate parameter definition for items/);
    });

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
      }, /function testmethod1 - invalid argument type for count, expected Integer got notanumberlol/);
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

    it('should work for a single parameter', function() {
      const result = testmodule.testmethod3('hejsasa');
      assert.equal(result, 'xhejsasa');
    });

    it('should get a module property', function() {
      assert.ok(testmodule.testobject);
      assert.equal(testmodule.testobject.string, 'hello');
    });

    it('should throw a type error if calling an undefined function', function() {
      assert.throws(function() {
        testmodule.testmethodXXX('hejsasa');
      }, /TypeError: testmodule.testmethodXXX is not a function/);
    });

    it('should not attempt validation if no docblock', function() {
      const result = testmodule.testmethod4('hejsasa');
      assert.equal(result, 'xhejsasa');
    });

    it('should check a function parameter', function() {
      const result = testmodule.testmethod5('hejsasa', (msg) => msg + 'x');
      assert.equal(result, 'xhejsasax');

      assert.throws(function() {
        testmodule.testmethod5('hejsasa', 'notafunction');
      }, /invalid argument type for callback, expected Function got notafunction/);
    });

    it('should check a deep option', function() {
      const result = testmodule.testmethod6({ moreOptions: { evenMoreOptions: { stuff: [1,2,3], message: 'hej' } } });
      assert.deepEqual(result, [1,2,3, 'hej']);

      assert.throws(function() {
        testmodule.testmethod6({ moreOptions: { evenMoreOptions: { stuff: 'hej', message: 123 } } });
      }, /invalid argument type for options.moreOptions.evenMoreOptions.stuff, expected Array got hej/);
    });

    it('should use a custom validator', function() {
      paramount.addValidator('LongString', (arg) => typeof arg === 'string' && arg.length > 10);
      const result = testmodule.testmethod7('hejsasasasasa');
      assert.equal(result, 13);

      assert.throws(function() {
        testmodule.testmethod7('yikes');
      }, /invalid argument type for msg, expected LongString got yikes/);
    });
  }); // End describe require

  describe('setErrorHandler', function() {
    const testmodule = paramount.require('./testmodule', module);

    it('should throw an error if argument is not a function', function() {
      assert.throws(function() {
        paramount.setErrorHandler('notafunction');
      }, /Error handler must be a function/);
    });

    it('should set a custom errorhandler and call it on errors', function() {
      paramount.setErrorHandler((functionName, paramName, expectedType, value, desc) => {
        throw new Error(`[${functionName}][${paramName}][${expectedType}][${value}][${desc}]`);
      });
      assert.throws(function() {
        testmodule.testmethod1({
          option1: 'notanumberlol',
          option2: 'hejsa',
          stuff: [1,2]
        }, ['a', 'b'], 1337, 'hovsa');
      }, /\[testmethod1\]\[options.option1\]\[Number\]\[notanumberlol\]\[\]/);
    });
  }); // End describe setErrorHandler

  describe('coalesceParams', function() {
    it('should organize properties under their parent parameters', function() {
      const result = paramount.coalesceParams([
       '{Object} [options] All your options',
       '{Number} [options.option1] Important number',
       '{String} [options.option2]',
       '{Array}  [options.stuff]',
       '{Array}  [items]',
       '{Number} [count]',
       '{String} [message]]',
       'Blah blah I\'m not a docblock'
      ].map(paramount.parseDocblockParam));
      assert.deepEqual(result, {
        options: {
          type: 'Object',
          name: 'options',
          property: false,
          desc: 'All your options',
          depth: 1,
          properties: [
            { type: 'Number', name: 'options', property: 'option1', desc: 'Important number', depth: 2 },
            { type: 'String', name: 'options', property: 'option2', desc: '', depth: 2 },
            { type: 'Array', name: 'options', property: 'stuff', desc: '', depth: 2 }
          ]
        },
        items: { type: 'Array', name: 'items', property: false, desc: '', depth: 1 },
        count: { type: 'Number', name: 'count', property: false, desc: '', depth: 1 },
        message: { type: 'String', name: 'message', property: false, desc: '', depth: 1 }
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
          depth: 1,
          properties: [
            { type: 'Unknown', name: 'options', property: 'option1', desc: '', depth: 2 },
            { type: 'Array', name: 'options', property: 'stuff', desc: '', depth: 2 } 
          ] 
        },
        items: { type: 'Array', name: 'items', property: false, desc: '', depth: 1 },
        count: { type: 'Unknown', name: 'count', property: false, desc: '', depth: 1 },
        message: { type: 'String', name: 'message', property: false, desc: '', depth: 1 }
      });
    });
  }); // End describe coalesceParams

  describe('parseDocblockParam', function() {
    it('should parse a docblock param and return an object', function() {
      assert.deepEqual(paramount.parseDocblockParam('{String} [message] A message for you'), {
        type: 'String',
        name: 'message',
        desc: 'A message for you',
        property: false,
        depth: 1
      });
      assert.deepEqual(paramount.parseDocblockParam('{Number} [count]'), {
        type: 'Number',
        name: 'count',
        desc: '',
        property: false,
        depth: 1
      });
      assert.deepEqual(paramount.parseDocblockParam('{Number} [options.count]'), {
        type: 'Number',
        name: 'options',
        desc: '',
        property: 'count',
        depth: 2
      });
      assert.deepEqual(paramount.parseDocblockParam('{Number} [options.count] A lotta stuff  '), {
        type: 'Number',
        name: 'options',
        desc: 'A lotta stuff',
        property: 'count',
        depth: 2
      });
    });

    it('should return false if no values for type or param name', function() {
      assert.equal(paramount.parseDocblockParam('{} []'), false);
    });

    it('should return false if not parseable', function() {
      assert.equal(paramount.parseDocblockParam('[Number] {options.count} A lotta stuff  '), false);
    });
  }); // End describe parseDocblockParam
}); // End describe paramount
