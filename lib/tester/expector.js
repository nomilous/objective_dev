// TODO: allow Action.functionName.stub(fn,...)
// TODO: fix require sequencing problem

// TODO: support attaching objects to mock with nested functions
//
//            thing.does 
//               obj:
//                  fn1: ->
//                  fn2: ->

var shortid = require('shortid')
  , pipeline = objective.pipeline
  , warn = objective.logger.warn
  , error = objective.logger.error
  , objects // list of objects expected upon
  , dev = require('../')
  , clone = require('clone')
  , originalFunction = function() {}
  , debug = objective.logger.createDebug('dev:expector')
  , ExpectationError = require('../errors').ExpectationError
  , ConfigurationError = require('../errors').ConfigurationError
  ;

module.exports.objects = objects = {};

pipeline.on('dev.test.after.each', 'valudate expectations',

  module.exports.validate = function(args) {

  // Check that all expectations were met. 
  // Restore original functions where appropriate.

  var failed = [];

  var keeps = {}; // stubs and spies can be created in beforeAlls
                 // so they need to be left in place.
                // before.each ahead of next test removes 
               // those that are no longer ancestral.

  for (var id in objects) {

    var object = objects[id].object;
    var expected = objects[id].functions.expected;
    var called = objects[id].functions.called;
    var original = objects[id].functions.original;
    var keepsObj = keeps[id] = {};

    for (var funcName in expected) {

      var remaining = []; // expectations uncalled
      var wascalled = [];    // calls that were made
      var matters = true;
      var keepsObjFn = keepsObj[funcName] = [];

      // filter out all but valid expectations

      for (var i = expected[funcName].length-1; i >= 0; i--) {
        if (expected[funcName][i].stubType == 'stub') {
          matters = false; // expectations before stub dont count
        }
        if (matters && expected[funcName][i].stubType == 'expectation')
          remaining.push(expected[funcName][i]);
        else
          keepsObjFn.unshift(expected[funcName][i]); // The entire stack of stubs and spies and
                                                    // and stubbed expectations survives into
                                                   // the next step. The before each then clears
                                                  // those it should.
      }

      if (called[funcName]) {
        for (var i = called[funcName].length-1; i >=0; i--) {
          if (called[funcName][i].stubType == 'expectation')
            wascalled.push(called[funcName][i]);
        }
      }

      objects[id].functions.expected[funcName] = remaining;
      objects[id].functions.called[funcName] = wascalled;

      // restore original function

      if (keepsObjFn.length == 0) {
        object[funcName] = original[funcName];
      }

      if (remaining.length > 0) {
        failed.push((object.$$mockname || object.constructor.name) + '.' + funcName + '()')
      }
    }
  }

  if (failed.length > 0 && !args.test.node.skip && !args.test.node.pend) {
    var copy;
    try {
      copy = clone(objects)
    } catch (e) {
      error('Failed expectation state clone for \'%s\'', args.test.node.str, e);
    }
    if (!args.test.node.error || args.test.node.error.name == 'TimeoutError') {
      args.test.node.error = new ExpectationError('Missing call(s) to ' + failed.join(', '),{
        detail: {
          failed: failed,
          objects: copy
        }
      });
    }
  }

  // clear expectations ahead of next run

  for (var id in objects) {
    for (var funcName in objects[id].functions.expected ) {
      if (keeps[id][funcName].length > 0) objects[id].functions.expected[funcName] = keeps[id][funcName]
      else objects[id].functions.expected[funcName] = [];
      objects[id].functions.called[funcName] = [];
    }
  }


}, true);


pipeline.on('dev.test.before.each', 'purge expectations',

  module.exports.purge = function(args) {

    // validate() Has left expectations/stubs/spies in place that may still 
    //            be valid for this next test. This next test may be in a 
    //            new context so remove those stubs that are no longer ancestral.
    
    var testNode = args.test.node;
    
    var ancestral = function(originId, node) {
      if (node.id == originId) return true;
      if (node.parent) return ancestral(originId, node.parent);
      return false;
    }
    
    for (var id in objects) {

      var object = objects[id].object;
      var expected = objects[id].functions.expected;
      var original = objects[id].functions.original;

      if (!expected) continue;

      for (var funcName in expected) {

        var keeps = [];
        var expectations = expected[funcName];

        if (!expectations) continue;

        if (expectations.length == 0) continue;

        for (var i = 0; i < expectations.length; i++) {

          var expectation = expectations[i];
          
          // if not ancestral, all the rest aren't either. 
          if (!ancestral(expectation.origin.node.id, testNode)) break;

          // if not a beforeAll, then it's a beforeEach, 
          // and will be recreated. Leave a gap for it.
          if (expectation.origin.type != 'beforeAll') {
            keeps.push(null);
          } else {
            keeps.push(expectation);
          }

        }

        // No expectations left
        if (keeps.length == 0) {
          object[funcName] = original[funcName];
        } 

        while (keeps[keeps.length - 1] === null) keeps.pop(); 

        objects[id].functions.expected[funcName] = keeps;  
      }
    }
}, true);


pipeline.on('dev.test.after.all', 'flush expectations',

  module.exports.flush = function(args) {

    // Fully restore original functions and clear objects

    debug('flush expectations');

    for (var id in objects) {

      var object = objects[id].object;
      var original = objects[id].functions.original;
      var expected = objects[id].functions.expected;

      for (var funcName in expected) {
        object[funcName] = original[funcName];
        debug('all restore \'%s()\' on \'%s\'', funcName, object.$$mockid);
      }

      delete objects[id];

      // keep.  why?
      objects[id] = {
        object: object,
        functions: {
          expected: {},
          called: {},
          original: {}
        }
      }
    }

}, true);



module.exports.create = function(object) {

  if (object.$$mockid) return object;
  return module.exports.createExpector(object);

}

module.exports.createExpector = function(object) {

  Object.defineProperty(object, '$$mockid', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: shortid.generate()
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

  var stubbers = ['does', /*'Does',*/ 'mock', /*'Mock',*/ 'spy', /*'Spy',*/ 'stub' /*, 'Stub'*/];
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
        if (!dev.runStep) {
          var thisAt;
          try {
            thisAt = (dev.runStep || dev.walkStep).step.info;
          } catch (e) {}
          throw new ConfigurationError('Cannot use '+stubFn.toLowerCase()+'() out of test or hook.', {
            thisAt: thisAt
          });
        }
        var type = dev.runStep.step.type
        if (type != 'afterEach' && type != 'afterAll') {
          if (stubFn == 'stub') return module.exports.mocker(stubFn, id);
          // if (stubFn == 'Stub') return module.exports.mocker(stubFn, id);
          if (stubFn == 'spy') return module.exports.mocker(stubFn, id);
          // if (stubFn == 'Spy') return module.exports.mocker(stubFn, id);
        }
        if (type != 'test' && type != 'beforeEach') {
          throw new ConfigurationError('Can only use '+stubFn.toLowerCase()+'() in test or beforeEach.',{
            thisAt: dev.runStep.step.info
          });
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

  var object = objects[id].object;
  var functions = objects[id].functions;
  var argsArray;
  var listedFn;
  var i;

  stubType = stubFn.toLowerCase();

  if (stubType == 'does' || stubType == 'mock') stubType = 'expectation';

  return function(list) {

    if (typeof list == 'function') {
      argsArray = Array.prototype.slice.call(arguments);
      list = {};
      i = 0;
      while (listedFn = argsArray.shift()) {
        if (typeof listedFn == 'function') {
          // allow multiple of same name
          list['$'+(i++)+'$'+listedFn.name] = listedFn;
        }
      }
    }

    if (typeof list == 'object') {

      var expectation;
      var expectations = [];

      for (var funcName in list) {
        
        (function(funcName){
          var seqName = funcName;
          funcName = funcName.replace(/^\$[0-9]+\$/, '');

          var e;
          var origin = dev.runStep || dev.walkStep;

          debug(
            'creating %s \'%s.%s()\' in \'%s\' step on node \'%s:%s\' with id %s',
            stubFn,
            object.$$mockname || 'object',
            funcName,
            origin.step.type,
            origin.step.node.type,
            origin.step.node.str || 'untitled',
            origin.step.node.id
          )

          expectation = {
            stubType: stubType,
            fn: list[seqName],
            created: objective.getCaller(2),
            origin: origin.step,
          };

          expectations.push(expectation); // for as()
          functions.expected[funcName] = (functions.expected[funcName] || []);

          // filter() May have left gaps for expectations repeated in beforeEach hooks
          //          that were surrounded by expectations set in beforeAll hooks that
          //          will not be repeated. Push into the gaps.
          var gap;
          for (gap = 0; gap < functions.expected[funcName].length; gap++) {
            if (!functions.expected[funcName][gap]) break;
          }
          if (gap == functions.expected[funcName].length) {
            functions.expected[funcName].push(expectation);
          } else {
            functions.expected[funcName][gap] = expectation;
          }
          functions.called[funcName] = (functions.called[funcName] || []);

          var existing;
          var calling = function(context, args) {
            return module.exports.handleCall.call(context, funcName, id, args);
          }

          existing = object[funcName];
          if (existing && existing.toString().match(/STUBBED_FUNCTION/)) {
            return;
          }
          functions.original[funcName] = existing;
          object[funcName] = function() {
            // STUBBED_FUNCTION
            return calling(this, arguments);
          }

        })(funcName);
      }

      return object;
    }
  }
}

module.exports.handleCall = function(funcName, id, args) {

  // Handle call is called with the context (this) of 
  // the outer caller calling the mock function.

  var expectations = objects[id].functions.expected[funcName];
  var called = objects[id].functions.called[funcName];
  var originalFn = objects[id].functions.original[funcName];
  var object = objects[id].object;
  var i //, result, copy, reversed;

  if (object.$$mockid == this.$$mockid) {
    // If the mock was created on the prototype then the mock id's will
    // match up, but not all vars placed onto `this` by constructor etc.
    // will be present in the mock object (the prototype), so reassign.
    //
    object = this;
  }
  
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

  if (typeof expectations === 'undefined') {
    return console.log('BUG: missing expectations for \`%s\`', funcName);
  }

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
    expectation.called = objective.getCaller(3);
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
          if (existingError instanceof ExpectationError) {
            existingError.detail.count++;
          }
          break;
        }

        dev.runStep.step.node.error = new ExpectationError(
          'Unexpected call(s) to ' + (object.$$mockname || object.constructor.name) + '.' + funcName + '()', {
            detail: {
              thisObject: id,
              thisFunction: funcName,
              count: 0,
              objects: clone(objects)
            }
          }
        );
        break;
      }
    }

    if (spies.length > 0) spies.forEach(function(spy) {
      spy.fn.apply(spy.context || object, args);
    });

    if (stub) {

      stub.called = objective.getCaller(3);
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
        } catch (e) {
          throw e;
        }
      }
    }
  }
}

