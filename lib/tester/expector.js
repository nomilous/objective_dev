var generate = require('shortid').generate
  , pipeline = objective.pipeline
  , warn = objective.logger.warn
  , objects // list of objects expected upon
  , dev = require('../')
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

  if (object.$$mockid) return object;
  return module.exports.createExpector(object);

}

module.exports.createExpector = function(object) {

  Object.defineProperty(object, '$$mockid', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: generate()
  });

  var id = object.$$mockid;
  objects[id] = {
    object: object,
    functions: {
      expected: {},
      original: {}
    }
  }

  var stubbers = ['does', 'Does', 'mock', 'Mock', 'spy', 'Spy', 'stub', 'Stub'];
  stubbers.forEach(function(stubFn) {
    if (typeof object[stubFn] !== 'undefined') {
      var name;
      try {
        name = object.$$mockname ? object.$$mockname : object.constructor.name
      } catch (e) {}
      warn('Cannot create mocker (.%s) on \'%s\'', stubFn, name);
      return;
    }
    Object.defineProperty(object, stubFn, {
      enumarable: false,
      configurable: false,
      get: function() {
        var type = dev.runStep.step.type
        if (type != 'test' && type != 'beforeEach') {
          if (stubFn == 'does' || stubFn == 'Does' || stubFn == 'mock' || stubFn == 'Mock') {
            var e = new Error('Can only create expectation in test or beforeEach. Try stub or spy.');
            e.name = 'ConfigurationError';
            e.thisAt = dev.runStep.step.info;
            throw e;
          }
        }
        return module.exports.mocker(stubFn, id);
      }
    });
  });
  return object;
}

// module.exports.mockers = {};

module.exports.mocker = function(stubFn, id) {

  var classifier = stubFn.match(/^[A-Z]/) ? 'instance' : 'prototype';
  var object = objects[id].object;
  var functions = objects[id].functions;
  var objectType = object.prototype ? 'class' : 'instance';

  stubType = stubFn.toLowerCase();

  if (stubType == 'does') stubType = 'mock';

  return function(list) {
    if (typeof list == 'object') {
      var expectation;
      var expectations = [];
      var returnType;
      for (var funcName in list) {
        (function(funcName){

          expectation = {
            classifier: classifier,
            objectType: objectType,
            stubType: stubType,
            fn: list[funcName]
            // context: null (undefined)
          };

          expectations.push(expectation); // for as()

          // TODO: check previous, only certain type sequences are allowd
          functions.expected[funcName] = (functions.expected[funcName] || []);
          functions.expected[funcName].push(expectation);

          var existing;
          var calling = function() {
            console.log('calling:',this);
          }

          if (objectType == 'class' && classifier == 'prototype') {

            // expectation on class prototype (return .as for context)

            returnType = 'as';
            existing = object.prototype[funcName];
            if (existing && existing.toString().match(/STUBBED_FUNCTION/)) {
              return;
            }
            functions.original[funcName] = existing;
            object.prototype[funcName] = function() {
              // STUBBED_FUNCTION
              calling.apply(null, arguments);
            }

          } else {

            // expectations on object / instance (return .with for properties)

            returnType = 'with';
            existing = object[funcName];
            if (existing && existing.toString().match(/STUBBED_FUNCTION/)) {
              return;
            }
            functions.original[funcName] = existing;
            object[funcName] = function() {
              // STUBBED_FUNCTION
              calling.apply(null, arguments);
            }
          }
        })(funcName);
      }
      if (returnType == 'as') {
        return {
          as: function(obj) {
            console.log('pending as()');
          }
        }
      } else if (returnType == 'with') {
        return {
          with: function(obj) {
            console.log('pending with()');
          }
        }
      }
    }
  }
}
