// TODO  - promise recursion causing deeeeeep stack in failed tests
// TODO  - not flushing the necessary modules
// TODO  - it.only and context.only should still run when nested inside xcontext or xobjective
// TODO  - only inside only should only do the inside only
// TODO  - posible to stop at test timeout?


var pipeline = objective.pipeline
  , prepend = process.env.OBJECTIVE_DEV_PREPEND || ''
  , debug = objective.logger.createDebug('dev:runner')
  , error = objective.logger.error
  , warn = objective.logger.warn
  , promise = require('when').promise
  , sequence = require('when/sequence')
  , injector = require('./injector')
  , dev = require('../')
  , sep = require('path').sep
  , colors = require('colors')
  , EOL = require('os').EOL
  , currentStep
  , TimeoutError = require('../errors').TimeoutError
  , HookError = require('../errors').HookError
  , OverdoneError = require('../errors').OverdoneError
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
});

pipeline.on('objective.multiple.end', 'runAll',

  module.exports.runAll = function(args, next) {
  
  if (!dev.roots[args.root.config.uuid].config.runAll) return next();

  var only = false;
  var runs = Object.keys(args.root.children).map(function(uuid) {
    if (args.root.children[uuid].tree.only) only = true;
    return {
      tree: args.root.children[uuid].tree,
      config: args.root.children[uuid].config
    }
  }).filter(function(run){
    if (only) run.tree.only = true;
    return true;
  });

  sequence(
    runs.map(function(run) {
      return function() {
        return promise(function(resolve, reject) {
          var childArgs = {
            root: args.root,
            config: run.config
          };
          var deferral = {
            resolve: resolve,
            reject: reject
          };
          module.exports.run(deferral, childArgs, run.tree);
        });
      }
    })
  ).then(
    function() {
      next();
    },
    function(e) {
      error('In runAll', e.stack);
      next();
    }
  );
});

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
    if (err) warn('error in dev.test.before.all pipeline 1, possible bug', err, err.stack);

    return module.exports.recurse(root, config, testContext, tree).then(

      function(result) {
        return pipeline.emit('dev.test.after.all', {
          root: root,
          config: config,
          tree: tree,
          error: null,   /// TODO: check is this necessary?
          result: result
        }, 
        function(err, args){
          if (err) warn('error in dev.test.after.all pipeline 2, possible bug', err, err.stack);
          deferral.resolve(args.result);
        });
      },
      function(err) {
        return pipeline.emit('dev.test.after.all', {
          root: root,
          config: config,
          tree: tree,
          error: err,  /// TODO: does it ever reject the promise?
          result: null
        }, function(err, args){
          if (err) warn('error in dev.test.after.all pipeline 3, possible bug', err, err.stack);
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

    var tree = root.children[config.uuid].tree;
    var test = module.exports.createStep(testNode.info, 'test', testNode, testNode);
    var steps = [test];

    // Walk to root, inserting hooks into steps array
    var recurse = function(parent, undepth) {

      undepth++;
      ['beforeEach','beforeAll'].forEach(function(type){
        parent.hooks[type].reverse().forEach(function(hook){
          if (type == 'beforeAll' && hook.fn.runCount > 0) return;
          steps.unshift(module.exports.createStep(hook.info, type, parent, hook));
        });
      });
      ['afterEach', 'afterAll'].forEach(function(type){
        parent.hooks[type].forEach(function(hook){
          if (type == 'afterAll') {
            if (hook.fn.runCount > 0) return;
            if (undepth == 1) {
              var last = module.exports.isLastSibling(testNode, false);
              if (!last) return;
            } else {
              var last = module.exports.isLastSibling(testNode, true);
              if (!last) return;
            }
          }
          steps.push(module.exports.createStep(hook.info, type, parent, hook));
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
        if (err) warn('error in dev.test.before.each pipeline 4, possible bug', err, err.stack);

        return sequence(
          steps.map(function(step) {
            return function() {
              return promise(function(resolve, reject, notify) {

                if (tree.error) {
                  test.node.error = tree.error;
                  return resolve();
                }

                if (testNode.pend || testNode.skip) return resolve();

                try {

                  if (step.node.cancelled) {
                    var cancelledAt = step.node.cancelled.atStep;
                    var runAnyway = false;
                    test.node.error = new HookError('Error in ' + cancelledAt.type, {
                      cancelled: step.node.cancelled,
                      step: step
                    });
                    if (cancelledAt.node.id == step.node.id) {
                      if (step.type == 'afterAll' ) {
                        if (cancelledAt.type == 'beforeAll' || cancelledAt.type == 'beforeEach') {
                          runAnyway = true; 
                        }
                      } else if (step.type == 'afterEach') {
                      }
                    }
                    if (!runAnyway) return resolve();
                  }
                  
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
              test.node.reported = true;
              currentStep = undefined;
              if (err) warn('error in dev.test.after.each pipeline 5, possible bug', err, err.stack);
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

module.exports.isLastSibling = function(node, doRecurse) {
  var lastInParent = module.exports.getLastNotSkippedOrPending(node.parent.children);
  if (lastInParent == null) return true;
  if (!doRecurse) return (node.id == lastInParent.id);
  if (node.parent.type == 'root') return (node.id == lastInParent.id)
  else if (node.id !== lastInParent.id) return false;
  return module.exports.isLastSibling(node.parent, doRecurse);
}

module.exports.getLastNotSkippedOrPending = function(nodes, i) {
  if (typeof i === 'undefined') i = nodes.length - 1;
  var node = nodes[i];
  if (i == -1) return null;
  if (node.skip || node.pend) return module.exports.getLastNotSkippedOrPending(nodes, i - 1);
  return node;
}

module.exports.createStep = function(info, type, node, actor) {
  if (type != 'test' && typeof actor.fn.runCount === 'undefined') actor.fn.runCount = 0;
  return {
    info: info,
    type: type,
    node: node,
    str: actor.str,
    fn: actor.fn
  }
}

module.exports.wait = function() {

  if (!dev.runStep) {
    throw new Error('Cannot wait() here. Only in test or hook.');
  }

  if (dev.runningMultiple) return; // can only wait on per file runs

  var caller = objective.getCaller(1);
  caller.file = caller.file.replace(process.cwd() + sep, '');
  warn('Test waiting at %s:%s:%s',caller.file,caller.line,caller.colm);
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

  Object.defineProperty(global, prepend + 'see', {
    enumerable: true,
    configurable: true,
    get: function() {
      clearTimeout(timeout);
      return seeThis;
    }
  })

}

module.exports.createDone = function(root, config, currentStep, testContext, resolve, reject) {

  var timeout = 500;
  var onTimeout, done;
  var count = 0;

  try {
    timeout = dev.roots[root.config.uuid].config.timeout || 500;
  } catch (e) {
    // lazy, this to skip fixing test stubs
  }

  // step timeout (done not called)  
  currentStep.timeout = setTimeout(onTimeout = function(){

    if (currentStep.waiting) return; // wait was called, no timeout
    currentStep.step.endAt = Date.now();
    delete testContext.timeout;
    var e = new TimeoutError('In ' + currentStep.step.type, {
      node: currentStep.step.node,
      step: currentStep.step
    });
    // hooks timeout brings it down

    if (currentStep.step.type !== 'test') {
      if (module.exports.cancelBranch(root, currentStep.step, e)) {
        currentStep.step.node.error = e;
        return resolve();
      } else {
        return reject(e);
      }
    }
    if (currentStep.step.node.error) return resolve();
    currentStep.step.node.error = e;
    return resolve();

  }, timeout);

  // access to modify timeout in test
  testContext.timeout = function(t) {
    clearTimeout(currentStep.timeout);
    currentStep.timeout = setTimeout(onTimeout, t);
  }

  return currentStep.done = function(error) {
    if (error instanceof Error) {
      currentStep.step.node.error = error;
      error.step = currentStep.step;
    }
    count++;
    clearTimeout(currentStep.timeout);
    delete testContext.timeout;
    if (currentStep.waiting) return; // wait was called, no done
    if (count > 1) {
      if (currentStep.step.node.reported) {
        // already reported on test step, this done is late...
        currentStep.step.node.error = new OverdoneError('Done called ' + count + ' times. (LATE CALL)');
        var reporters = dev.roots[root.config.uuid].reporters;
        Object.keys(reporters).forEach(function(name) {
          try {
            reporters[name].showFailures({
              root: root,
              error: null
            }, [{
              test: {
                node: currentStep.step.node
              }
            }], false);
          } catch (e) {}
        });
      } else {
        currentStep.step.node.error = new OverdoneError('Done called ' + count + ' times.');
      }
      return;
    }
    currentStep.step.endAt = Date.now();
    resolve();
  }
}

module.exports.reset = function() {
  currentStep = undefined;
}

module.exports.runStep = function(root, config, testContext, step, resolve, reject) {

  var done, timeout;
  var stepArgs = objective.argsOf(step.fn);
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
      if (module.exports.cancelBranch(root, step, e)) {
        return resolve();
      }
      return reject(e);
    }
    step.node.error = e;
    return resolve();
  }

  step.startAt = Date.now();

  // Counting hooks to manage beforeAll and afterAll
  if (step.type != 'test') step.fn.runCount++;

  if (!currentStep.done) {
    currentStep.done = function(e) {
      step.endAt = Date.now();
      if (currentStep.timeout) clearTimeout(currentStep.timeout);
      delete testContext.timeout;

      if (e instanceof Error) {
        if (step.type != 'test') {
          if (module.exports.cancelBranch(root, step, e)) {
            return resolve();
          }
          return reject(e);
        }
        step.node.error = e;
        return resolve();
      }
    }
  }

  try {
    step.fn.apply(testContext, doWithArgs);
  } catch (e) {
    currentStep.done(e);
  }

  process.nextTick(function() {
    if (!done && !currentStep.waiting) {
      step.endAt = Date.now();
      return resolve();
    }
  })

}

module.exports.cancelBranch = function(root, step, e) {

  var recurse = function(node) {
    node.cancelled = {
      atStep: step,
      error: e
    }
    node.children.forEach(recurse);
  }

  // afterEach and afterAll fails all unrun tests

  if (step.type == 'afterEach' || step.type == 'afterAll') {
    var config = dev.roots[root.config.uuid].config;
    var runAll = config.runAll;
    //if (runAll) {
    Object.keys(root.children).forEach(function(uuid) {
      recurse(root.children[uuid].tree);
    });
    //}
    // console.log(root)
    return true;
  }

  // beforeEach and beforeAll fail only decendant tests
  recurse(step.node);
  return true;

}
