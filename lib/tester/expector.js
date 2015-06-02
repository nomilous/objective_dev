var generate = require('shortid').generate
  ;


module.exports.create = function(object) {

  Object.defineProperty(object, '$$id', {
    enumerable: false,
    configurable: false,
    value: generate()
  })

  return object;

}
