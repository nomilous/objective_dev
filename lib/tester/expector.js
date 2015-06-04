// TODO - original

var generate = require('shortid').generate
  , pipeline = objective.pipeline
  , warn = objective.logger.warn
  , objects // list of objects expected upon
  , dev = require('../')
  , deepcopy = require('deepcopy')
  , originalFunction = function() {}
  ;

module.exports.objects = objects = {};


module.exports.check = function(args) {

  // Check that all expectations were met. Restore original functions.
  // (called at 'dev.test.after.each')
  // Because expectations can only be set in beforeEach there are no
  // expectations that need to survive across multiple test stepruns.

  var failed = [];

  for (var id in objects) {

    var object = objects[id].object;
    var expected = objects[id].functions.expected;
    var called = objects[id].functions.called;
    var original = objects[id].functions.original;

    for (var funcName in expected) {

      var remaining = []; // expectations uncalled
      var wascalled = [];    // calls that were made
      var classifier;
      var objectType;

      // filter out all but valid expectations

      for (var i = expected[funcName].length-1; i >= 0; i--) {
        classifier = expected[funcName][i].classifier;
        objectType = expected[funcName][i].objectType;
        // expectations before stub dont count
        if (expected[funcName][i].stubType == 'stub') break;
        if (expected[funcName][i].stubType == 'expectation') 
          remaining.push(expected[funcName][i]);
      }

      if (called[funcName]) {
        for (var i = called[funcName].length-1; i >=0; i--) {
          if (called[funcName][i].stubType == 'expectation')
            wascalled.push(called[funcName][i]);
          classifier = called[funcName][i].classifier; //find them
          objectType = called[funcName][i].objectType; //somewhere
        }
      }

      objects[id].functions.expected[funcName] = remaining;
      objects[id].functions.called[funcName] = wascalled;

      // restore original function

      if (objectType == 'class' && classifier == 'prototype') {

        object.prototype[funcName] = original[funcName];

      } else {

        object[funcName] = original[funcName];

      }

      if (remaining.length > 0) {
        failed.push((object.$$mockname || object.constructor.name) + '.' + funcName + '()')
      }
    }
  }

  if (failed.length > 0 && !args.test.node.skip && !args.test.node.pend) {
    // console.log(args);
    var e = new Error('Missing call(s) to ' + failed.join(', '));
    e.name = 'ExpectationError';
    e.detail = {
      objects: deepcopy(objects) // objects are flushed, keep for stacks
    }
    args.test.node.error = e;
  }

  // clear expectations ahead of next run

  for (var id in objects) {
    for (var funcName in objects[id].functions.expected ) {
      objects[id].functions.expected[funcName] = [];
      objects[id].functions.called[funcName] = [];
    }
  }


}

module.exports.flush = function(args) {

  // Clear all expectation stubs and restore original functions
  // (called at 'dev.test.after.all')

  // now done in check, since banning creation of test spanning expectations.

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
      called: {},
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
          var e = new Error('Can only use '+stubFn.toLowerCase()+'() in test or beforeEach.');
          e.name = 'ConfigurationError';
          e.thisAt = dev.runStep.step.info;
          throw e;
        }
        return module.exports.mocker(stubFn, id);
      }
    });
  });
  return object;
}

module.exports.original = function() {
  return originalFunction;
}

module.exports.mocker = function(stubFn, id) {

  var classifier = stubFn.match(/^[A-Z]/) ? 'instance' : 'prototype';
  var object = objects[id].object;
  var functions = objects[id].functions;
  var objectType = object.prototype ? 'class' : 'instance';

  stubType = stubFn.toLowerCase();

  if (stubType == 'does' || stubType == 'mock') stubType = 'expectation';

  return function(list) {
    if (typeof list == 'object') {
      var expectation;
      var expectations = [];
      var returnType;
      for (var funcName in list) {
        (function(funcName){

          var e;

          expectation = {
            classifier: classifier,
            objectType: objectType,
            stubType: stubType,
            fn: list[funcName],
            created: module.exports.createInfo(4)
            // context: null (undefined)
          };

          if (e = module.exports.invalid(
            funcName,
            expectation,
            functions
          )) throw e;

          expectations.push(expectation); // for as()
          functions.expected[funcName] = (functions.expected[funcName] || []);
          functions.expected[funcName].push(expectation);
          functions.called[funcName] = (functions.called[funcName] || []);

          var existing;
          var calling = function() {
            return module.exports.handleCall(funcName, id, arguments);
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
              return calling.apply(null, arguments);
            }

          } else {

            // expectations on object / instance (return .with for properties)

            // returnType = 'with';
            existing = object[funcName];
            if (existing && existing.toString().match(/STUBBED_FUNCTION/)) {
              return;
            }
            functions.original[funcName] = existing;
            object[funcName] = function() {
              // STUBBED_FUNCTION
              return calling.apply(null, arguments);
            }
          }
        })(funcName);
      }
      if (returnType == 'as') {
        return {
          as: function(obj) {
            expectations.forEach(function(ex) {
              ex.context = obj;
            });
          }
        }
      } 
      return object;
      // else if (returnType == 'with') {
      //   return {
      //     with: function(obj) {
      //       console.log('pending with()');
      //     }
      //   }
      // }
    }
  }
}

module.exports.handleCall = function(funcName, id, args) {

  var expectations = objects[id].functions.expected[funcName];
  var called = objects[id].functions.called[funcName];
  var originalFn = objects[id].functions.original[funcName];
  var object = objects[id].object;
  var i //, result, copy, reversed;
  
  originalFunction = originalFn;

  // Find the first expectation


  // if there are any spies underneath, 
  // first call them, 
  // but dont call any spies that were stubbed
  var spies = [];
  var expectation;
  var stub;
  var position;
  // var reversed = expectations.reverse()
  for (i = expectations.length-1; i >= 0; i--) {
    if (expectations[i].stubType == 'stub') {
      stub = expectations[i];
      break;
    }
    if (expectations[i].stubType == 'spy') spies.unshift(expectations[i]);
    if (expectations[i].stubType == 'expectation') {
      expectation = expectations[i];
      position = i;
    }
  }

  if (expectation) {

    // there was an expectation that followed a stub,
    // or there was no stub.

    // mark as called and remove from expectations

    expectations.splice(position,1);
    expectation.called = module.exports.createInfo(5);
    called.push(expectation);

    // if there were spies call them first.

    if (spies.length > 0) spies.forEach(function(spy) {
      spy.fn.apply(expectation.context || object, args);
    });

    expectation.result = expectation.fn.apply(expectation.context || object, args);
    return expectation.result;

  } 

  else {

    // no waiting expectations, if there are expectations in called[]
    // then this should fail

    var tooManyCalls = false;
    for (var i = 0; i < called.length; i++) {

      if (called[i].stubType == 'expectation') {
        tooManyCalls = true;
        if (dev.runStep.step.node.error) {
          var existingError = dev.runStep.step.node.error;
          if (existingError.detail && existingError.detail.count) {
            existingError.detail.count++;
          }
          break;
        }
        var e = new Error('Unexpected call(s) to ' + (object.$$mockname || object.constructor.name) + '.' + funcName + '()');
        e.name = 'ExpectationError';
        e.detail = {
          thisObject: id,
          thisFunction: funcName,
          thisCall: {
            info: module.exports.createInfo(5)
          },
          count: 0,
          objects: deepcopy(objects) // objects are flushed, keep for stacks
        }
        dev.runStep.step.node.error = e;
        break;
      }
    }

    if (spies.length > 0) spies.forEach(function(spy) {
      spy.fn.apply(spy.context || object, args);
    });

    if (stub) {

      stub.called = module.exports.createInfo(5);
      called.push(stub);
      stub.result = stub.fn.apply(stub.context || object, args);
      return stub.result

    } else {

      if (tooManyCalls) {

        // Too many calls to expectation and no stub to send the
        // extra call to. Um? 
        // - Call original?
        // - Do nothing?
        // - Return result from earlier call?

      } else {
        // there were only spies, proeed to original
        try {
          return originalFn.apply(object, args);
        } catch (e) {} // there might not be an original
      }
    }
  }
}

module.exports.createInfo = function(depth) {
  return objective.getCaller(depth)
}

module.exports.invalid = function(funcName, expectation, functions) {

  if (!functions.expected[funcName]) return; // first expectation.

  // ensure not changing classifier or object type for this function

  for (var i = 0; i < functions.expected[funcName].length; i++) {
    var ex = functions.expected[funcName][i];
    if (ex.classifier != expectation.classifier || ex.objectType != expectation.objectType) {
        var e = new Error('Cannot change expectation type for function \'funcName\'');
        e.name = 'ConfigurationError';
        e.thisAt = dev.runStep.step.info;
        return e;
    }
  }
  return
}

