
var pipeline = objective.pipeline
  , debug = objective.logger.createDebug('dev:runner')
  , error = objective.logger.error
  , warn = objective.logger.warn
  , promise = require('when').promise
  , sequence = require('when/sequence')
  , util = require('also').util
  , injector = require('./injector')
  , dev = require('../')
  , sep = require('path').sep
  , currentStep
  ;

pipeline.createEvent('dev.test.before.all');
pipeline.createEvent('dev.test.after.all');
pipeline.createEvent('dev.test.after.each');
pipeline.createEvent('dev.test.before.each');

// Access the currently running step. 
// This could be a hook or a test
Object.defineProperty(dev, 'runStep', {
  enumerable: true,
  get: function() {
    return currentStep;
  }
})

module.exports.run = function(deferral, args, tree) {

  var root = args.root; // root objective
  var config = args.config;

  if (tree.only) module.exports.assignSkip(tree);

  pipeline.emit('dev.test.before.all', {
    root: root,
    config: config,
    tree: tree,
    context: {}
  }, function(err, res) {

    var testContext = res.context;
    if (err) warn('error in test pipeline 1, possible bug', err, err.stack);

    return module.exports.recurse(root, config, testContext, tree).then(

      function(result) {
        return pipeline.emit('dev.test.after.all', {
          root: root,
          config: config,
          tree: tree,
          error: null,
          result: result
        }, 
        function(err, args){
          if (err) warn('error in test pipeline 2, possible bug', err, err.stack);
          deferral.resolve(args.result);
        });
      },
      function(err) {
        return pipeline.emit('dev.test.after.all', {
          root: root,
          config: config,
          tree: tree,
          error: err,
          result: null
        }, function(err, args){
          if (err) warn('error in test pipeline 3, possible bug', err, err.stack);
          deferral.resolve(args.result);
        })
      },
      function(notify) {
        deferral.notify(notify);
      }
    )
  });
}

module.exports.assignSkip = function(tree) {
  // Some of the tests are marked as only
  // mark all the others as skipped.
  // Allows more than one .only()
  var recurse = function(node) {
    if (!node.only) node.skip = true;
    // .only() on context, skip everything but kids
    if (node.only && node.type == 'context') return;
    node.children.forEach(function(child) {
      recurse(child);
    });
  }
  recurse(tree);
}

module.exports.recurse = function(root, config, testContext, node) {
  if (node.type == 'context' || node.type == 'root') {
    return promise(function(resolve, reject, notify){
      sequence(node.children.map(function(child){
        return function() {
          return module.exports.recurse(root, config, testContext, child);
        }
      })).then(resolve, reject, notify);
    });
  }
  else if (node.type == 'it') {
    return module.exports.runTest(root, config, testContext, node);
  }
}

module.exports.runTest = function(root, config, testContext, testNode) {
  debug('run test', testNode);
  return promise(function(resolve, reject, notify) {
    
    // Assemble sequence of functions (steps) to be run 
    // for this test. This includes hooks.

    var test = module.exports.createStep(testNode.info, 'test', testNode, testNode.fn);
    var steps = [test];

    // Walk to root, inserting hooks into steps array
    var recurse = function(parent, undepth) {

      undepth++;
      ['beforeEach','beforeAll'].forEach(function(type){
        parent.hooks[type].reverse().forEach(function(hook){
          if (type == 'beforeAll' && hook.fn.runCount > 0) return;
          steps.unshift(module.exports.createStep(hook.info, type, parent, hook.fn));
        });
      });
      ['afterEach', 'afterAll'].forEach(function(type){
        parent.hooks[type].forEach(function(hook){
          if (type == 'afterAll') {
            if (hook.fn.runCount > 0) return;
            if (undepth == 1) {
              var last = module.exports.isLastInParent(testNode, false);
              if (!last) return;
            } else {
              var last = module.exports.isLastInParent(testNode, true);
              if (!last) return;
            }
          }
          steps.push(module.exports.createStep(hook.info, type, parent, hook.fn));
        });
      });

      if (parent.parent) recurse(parent.parent, undepth);
    }

    var undepth = 0; //distance recursed back to root
    recurse(testNode.parent, undepth);

    return pipeline.emit('dev.test.before.each', {
        root: root,
        config: config,
        steps: steps,
        test: test,
        context: testContext
      }, 
      function(err, args){
        if (err) warn('error in test pipeline 4, possible bug', err, err.stack);

        return sequence(
          steps.map(function(step) {
            return function() {
              return promise(function(resolve, reject, notify) {

                if (testNode.pend || testNode.skip) return resolve();

                try {
                
                  module.exports.runStep(root, config, testContext, step, resolve, reject);

                } catch (e) {

                  error('Unexpected!', e.stack);

                }

              });
            }
          })
        ).then(
          function(result) {
            return pipeline.emit('dev.test.after.each', {
              root: root,
              config: config,
              steps: steps,
              test: test,
              context: testContext,
              result: result
            },
            function(err, res) {
              currentStep = undefined;
              if (err) warn('error in test pipeline 5, possible bug', err, err.stack);
              resolve();
            });
          },
          reject,
          notify
        );
      }
    );
  });
}

module.exports.isLastInParent = function(node, doRecurse) {
  var lastInParent = node.parent.children[node.parent.children.length -1];
  if (!doRecurse) return (node.id == lastInParent.id);
  if (node.parent.type == 'root') return (node.id == lastInParent.id)
  else if (node.id !== lastInParent.id) return false;
  return module.exports.isLastInParent(node.parent, doRecurse);
}

module.exports.createStep = function(info, type, node, fn) {
  if (type != 'test' && typeof fn.runCount === 'undefined') fn.runCount = 0;
  return {
    info: info,
    type: type,
    node: node,
    fn: fn
  }
}

module.exports.wait = function() {

  if (!dev.runStep) {
    throw new Error('Cannot wait() here. Only in test or hook.');
  }

  if (dev.runningMultiple) return; // can only wait on per file runs

  var caller = objective.getCaller(2);
  caller.file = caller.file.replace(process.cwd() + sep, '');
  warn('Test waiting at %s:%s:%s',caller.file,caller.line,caller.col);
  warn('Resave without wait() to resume.');
  warn('It proceeds after %d seconds unless you see.* in the repl',(
    typeof arguments[0] == 'number' ? arguments[0] / 1000 : 10
  ));
  dev.runStep.waiting = {};

  var length = 10000; // dont wait forever, first arg can assign how long
  if (typeof arguments[0] == 'number') length = arguments[0];
  var timeout = setTimeout(function() {
    seeThis = {};
    dev.runStep.step.endAt = Date.now();
    dev.runStep.resolve();
  }, length);

  var seeThis = {};

  var args = dev.runStep.step.fn.toString().split('wait');
  args = args[1].split('(');
  args = args[1].split(')');
  args = args[0].split(',');
  //args = args.filter(function(arg){return arg.trim()});
  var i = 0;
  var _arguments = arguments;
  args.forEach(function(arg) {
    if (arg == '') return;
    arg = arg.trim();
    seeThis[arg] = _arguments[i++];
  });

  Object.defineProperty(seeThis, 'done', {
    enumerable: true,
    get: function() {
      try {
        dev.runStep.step.endAt = Date.now();
        dev.runStep.resolve();
        seeThis = {};
      } catch (e) {}
    }
  })

  Object.defineProperty(global, 'see', {
    enumerable: true,
    configurable: true,
    get: function() {
      clearTimeout(timeout);
      return seeThis;
    }
  })

}

module.exports.createDone = function(root, config, currentStep, testContext, resolve, reject) {
  
  var onTimeout, done;

  // step timeout (done not called)  
  currentStep.timeout = setTimeout(onTimeout = function(){

    if (currentStep.waiting) return; // wait was called, no timeout
    currentStep.step.endAt = Date.now();
    delete testContext.timeout;
    var e = new Error('In ' + currentStep.step.type);
    e.name = 'TimeoutError';
    e.node = currentStep.step.node;
    // hooks timeout brings it down
    if (currentStep.step.type !== 'test') return reject(e);
    currentStep.step.node.error = e;
    return resolve();

  }, 2000);

  // access to modify timeout in test
  testContext.timeout = function(t) {
    clearTimeout(currentStep.timeout);
    currentStep.timeout = setTimeout(onTimeout, t);
  }

  return done = function() {
    clearTimeout(currentStep.timeout);
    delete testContext.timeout;
    if (currentStep.waiting) return; // wait was called, no done
    currentStep.step.endAt = Date.now();
    resolve();
  }
}

module.exports.runStep = function(root, config, testContext, step, resolve, reject) {

  var done, timeout;
  var stepArgs = util.argsOf(step.fn);
  var doWithArgs = [];

  currentStep = {
    root: root,
    config: config,
    context: testContext,
    step: step,
    resolve: resolve,
    reject: reject,
    timeout: null,
    waiting: null
  };

  if (stepArgs.indexOf('done') != -1) {
    done = module.exports.createDone(root, config, currentStep, testContext, resolve, reject);
  }

  try {
    for (var i = 0; i < stepArgs.length; i++) {
      var arg = stepArgs[i];
      if (arg == 'done') {
        doWithArgs.push(done);
        continue;
      }
      debug('injecting %s', arg);
      doWithArgs.push(injector.load(root, config, arg));
    }
  }
  catch (e) {
    if (step.type != 'test') {
      // Only tests are allowed to fail.
      // Hooks bring down the run
      // TODO, run afters appropriately on before fail
      return reject(e);
    }
    step.node.error = e;
    return resolve();
  }

  step.startAt = Date.now();

  // Counting hooks to manage beforeAll and afterAll
  if (step.type != 'test') step.fn.runCount++;

  try {
    step.fn.apply(testContext, doWithArgs);
  } catch (e) {
    step.endAt = Date.now();
    if (currentStep.timeout) clearTimeout(currentStep.timeout);
    delete testContext.timeout;
    if (step.type != 'test') {
      err = new Error('In ' + step.type);
      err.name = 'HookError';
      err.error = e;  //////////////// nesting error ? 
      err.node = step.node;
      return reject(err);
    }
    step.node.error = e;
    return resolve();
  }


  if (!done && !currentStep.waiting) {
    step.endAt = Date.now();
    return resolve();
  }

}


