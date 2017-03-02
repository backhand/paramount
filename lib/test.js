
const target = {
  a: (b, c) => b + c 
};

const p = new Proxy(target, {
  get: function(target, property, receiver) {
    return function() {
      return target[property].apply(null, Array.prototype.slice.call(arguments));
    }
    // console.log(`test.js:8 - target, property, receiver`, target, property, receiver);
    // return receiver[property];
  }
});

console.log(p.a(1,2));
