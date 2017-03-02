exports.testmethod1 = testmethod1;
exports.testmethod2 = testmethod2;
exports.testmethod3 = testmethod3;
exports.testmethod4 = testmethod4;
exports.testmethod5 = testmethod5;
exports.testmethod6 = testmethod6;
exports.testmethod7 = testmethod7;

/**
 * Test method 1
 *
 * @param {Object} [options] 
 * @param {Number} [options.option1]
 * @param {String} [options.option2]
 * @param {Array}  [options.stuff]
 * @param {Array}  [items]
 * @param {Integer} [count]
 * @param {String} [message]
 * @returns {String|null}
 */
function testmethod1(options, items, count, message) {
  return { 
    sum: options.option1 + count,
    msg: options.option2 + message,
    items: options.stuff.concat(items)
  };
}

/*
  Stuff to handle
  - parse errors in docblock
  - non-existent validator
  - undeclared property parent
*/
/**
 * Test method 2 - mangled docblock
 *
 * @param {Object} [options]
 * @param {Unknown} [option.option1]
 * @param {String} [invalid.option2]
 * @param {Array}  [options.stuff]
 * @param {Array}  [items]
 * @param {Unknown} [count]
 * @parax {String} [message]
 * @returns {String|null}
 */
function testmethod2(options, items, count) {
  return {
    sum: count,
    items: options.stuff.concat(items)
  };
}

/**
 * Test method 3 - single param
 *
 * @param {String} [message]
 * @returns {String|null}
 */
function testmethod3(message) {
  return 'x' + message;
}

function testmethod4(message) {
  return 'x' + message;
}

/**
 * Test method 5 - function callback
 *
 * @param {String} [message]
 * @param {Function} [callback]
 * @returns {String|null}
 */
function testmethod5(message, callback) {
  return 'x' + callback(message);
}

/**
 * Test method 6 - deep options
 *
 * @param {Object} [options] 
 * @param {Object} [options.moreOptions]
 * @param {Object} [options.moreOptions.evenMoreOptions]
 * @param {Array}  [options.moreOptions.evenMoreOptions.stuff]
 * @param {String} [options.moreOptions.evenMoreOptions.message]
 */
function testmethod6(options) {
  return options.moreOptions.evenMoreOptions.stuff.concat(options.moreOptions.evenMoreOptions.message);
}

/**
 * Test method 7 - custom validator
 *
 * @param {LongString} [msg] 
 */
function testmethod7(msg) {
  return msg.length;
}

