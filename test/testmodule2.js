exports.testmethod1 = testmethod1;

/**
 * Test method 1 - duplicate parameter definitions
 *
 * @param {Object} [options] 
 * @param {Number} [options.option1]
 * @param {String} [options.option2]
 * @param {Array}  [options.stuff]
 * @param {Array}  [items]
 * @param {Object} [items]
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
