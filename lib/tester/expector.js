var generate = require('shortid').generate
  , pipeline = objective.pipeline
  , warn = objective.logger.warn
  , objects // list of objects expected upon
  ;

module.exports.objects = objects = {};


module.exports.check = function(args) {

  // Check that all expectations were met.
  // (called at 'dev.test.after.each')



}

module.exports.flush = function(args) {

  // Clear all expectation stubs and restore original functions
  // (called at 'dev.test.after.all')

  
}

module.exports.create = function(object) {

  if (object.$$mockid) {
    if (!objects[object.$$mockid]) objects[objects.$$mockid] = {
      object: object
    }
    return object;
  }

  Object.defineProperty(object, '$$mockid', {
    enumerable: false,
    configurable: false,
    value: generate()
  })


  return object;

}
