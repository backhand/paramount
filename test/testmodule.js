
exports.testmethod1 = testmethod1;
exports.testmethod2 = testmethod2;

/**
 * Test method 1
 *
 * @param {Object} [options] 
 * @param {Number} [options.option1]
 * @param {String} [options.option2]
 * @param {Array}  [options.stuff]
 * @param {Array}  [items]
 * @param {Number} [count]
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
