var pipeline = objective.pipeline
  , debug = objective.logger.createDebug('runner')
  , error = objective.logger.error
  , warn = objective.logger.warn
  , promise = require('when').promise
  , sequence = require('when/sequence')
  , util = require('also').util
  , injector = require('./injector')
  , dev = require('../')
  , sep = require('path').sep
  ;

pipeline.createEvent('dev.test.before.all');
pipeline.createEvent('dev.test.after.all');
pipeline.createEvent('dev.test.after.each');
pipeline.createEvent('dev.test.before.each');

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
    if (err) error('error in test pipeline', err);
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
          if (err) error('error in test pipeline', err);
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
          if (err) error('error in test pipeline', err);
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
  // some of the tests are marked as only
  // mark all the others as skipped
  var recurse = function(node) {
    if (!node.only) node.skip = true;
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
        if (err) error('error in test pipeline',err);

        return sequence(
          steps.map(function(step) {
            return function() {
              return promise(function(resolve, reject, notify) {

                if (testNode.pend || testNode.skip) return resolve();

                module.exports.runStep(root, config, testContext, step, resolve, reject);

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
              delete dev.runStep;
              if (err) error('error in test pipeline',err);
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
  file = file.replace(process.cwd() + sep, '');
  warn('Test waiting at %s:%s:%s',caller.file,caller.line,caller.col);
  dev.runStep.waiting = {};

  var timeout = setTimeout(function() {
    // wait 6 seconds for the repl before moving on
    dev.runStep.step.endAt = Date.now();
    dev.runStep.resolve();
  }, 6000);

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
      dev.runStep.step.endAt = Date.now();
      dev.runStep.resolve();
    }
    // see remains after done.
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

module.exports.runStep = function(root, config, testContext, step, resolve, reject) {

  var done, timeout;
  var stepArgs = util.argsOf(step.fn);
  var doWithArgs = [];


  // currently running test step
  // --attach (objective.plugins.dev.runStep), gone unless wait() was called in test

  dev.runStep = {
    root: root,
    config: config,
    context: testContext,
    step: step,
    resolve: resolve,
    reject: reject,
    timeout: null,
    waiting: null
  };

  step.startAt = Date.now();

  for (var i = 0; i < stepArgs.length; i++) {
    var arg = stepArgs[i];
    var value;
    try {
      if (arg !== 'done') {
        doWithArgs.push(value = injector.load(root, config, arg));
        continue;
      }
    } catch (e) {

      if (done) {
        clearTimeout(dev.runStep.timeout);
        delete testContext.timeout;
        step.endAt = Date.now();
      }
      if (step.type != 'test') return reject(e);
      step.node.error = e;
      return resolve();
    }

    tooSlow = function() {
      if (dev.runStep.waiting) return;
      step.endAt = Date.now();
      clearTimeout(dev.runStep.timeout);
      delete testContext.timeout;
      var err = new Error('In ' + step.type);
      err.name = 'TimeoutError';
      err.node = step.node;
      // timeout in hooks fail entire run.
      if (step.type !== 'test') reject(err);
      step.node.error = err;
      resolve();
    }

    dev.runStep.timeout = setTimeout(tooSlow, 2000);

    done = function() {

      // BUG: when injection error, no runStep
      // console.log('done:', dev.runStep);
      // then how is done called?

      if (dev.runStep.waiting) return;
      step.endAt = Date.now();
      clearTimeout(dev.runStep.timeout);
      delete testContext.timeout;
      resolve();

    }

    testContext.timeout = function(n) {
      clearTimeout(timeout);
      dev.runStep.timeout = setTimeout(tooSlow, n);
    }

    doWithArgs.push(done);
  };

  if (step.type != 'test') step.fn.runCount++;

  try {
    step.fn.apply(testContext, doWithArgs);
  } catch (e) {
    step.endAt = Date.now();
    if (dev.runStep.timeout) clearTimeout(dev.runStep.timeout);
    delete testContext.timeout;
    if (step.type !== 'test') {
      err = new Error('In ' + step.type);
      err.name = 'HookError';
      err.error = e;
      err.node = step.node;
      reject(err);
    }
    step.node.error = e;
    resolve();
  }

  if (!done && !dev.runStep.waiting) {
    step.endAt = Date.now();
    return resolve();
  }

}


