// TODO learn which tests to run on src change per which srcs are required() by tests

module.exports.$$name = 'dev';

var roots;

module.exports.roots = roots = {};
module.exports.look = require('./look');
module.exports.doc = require('./doc');

var reporters  = require('./reporters')
  , pipeline  = objective.pipeline
  , commands = require('./commands')
  , handler = require('./handler')
  , tester = require('./tester')
  , error = objective.logger.error
  , startReporter
  , pendAll = false
  , runOnly = false
  ;

module.exports.reporters = reporters;
module.exports.expector = require('./tester/expector');
module.exports.injector = require('./tester/injector');
module.exports.errors = require('./errors');

pipeline.on('prompt.commands.register.ask', commands.register);
pipeline.on('files.watch.found', handler.foundFile, true);
pipeline.on('files.watch.end', handler.endRecurse, true);
pipeline.on('files.watch.changed', handler.changedFile, true);

pipeline.on('objective.injecting', tester.onInject, true);
pipeline.on('objective.starting', tester.onStarting, true);
pipeline.on('objective.not.promised', tester.onNotPromised, true);
pipeline.on('objective.run.error', tester.onError, true);
pipeline.on('objective.empty', tester.onEmpty, true);


process.on('uncaughtException', function(e) {
  if (module.exports.runStep) {
    module.exports.runStep.done(e)
    return;
  }
  error('Exception caught out of test', e, e.stack);
});


Object.defineProperty(module.exports, 'rootCount', {
  enumerable: true,
  get: function() {
    var count = 0;
    for(var key in roots) count++;
    return count;
  }
});

Object.defineProperty(module.exports, 'pendAll', {
  get: function(){return pendAll},
  set: function(v){pendAll = v}
});

Object.defineProperty(module.exports, 'runOnly', {
  get: function(){return runOnly},
  set: function(v){runOnly = v}
});

global.xobjective = function() {
  pendAll = true;
  objective.apply(null, arguments);
}

global.objective.only = function() {
  runOnly = true;
  objective.apply(null, arguments);
}

module.exports.$$createInstance = function(root, config, callback) {
  // keep track of all roots that initialize this plugin
  if (roots[root.config.uuid]) {
    console.log('\n\n\nmultiple objectives with uuid \'' + root.config.uuid + '\'\n\n');
    process.exit(1);
  }
  var runningReporters, dirs;

  roots[root.config.uuid] = {
    root: root,
    config: config,
    reporters: runningReporters = {},
    files: {
      test: {},
      source: {}
    }
  }

  // apply defaults to config where null

  config.testDir = (config.testDir || 'test');
  if (config.testAppend !== '')
    config.testAppend = (config.testAppend || '_test');

  if (config.sourceDir !== false) {
    config.sourceDir = 'lib';
  }

  // null compileTo means dont,
  // source and test dir files are watched (from the recurse)
  if (typeof config.reporter === 'undefined')
    if (typeof config.reporters === 'undefined')
      config.reporter = 'Default';

  if (config.reporter) startReporter(runningReporters, root, config.reporter, {});
  if (config.reporters) {
    Object.keys(config.reporters).forEach(function(name) {
      startReporter(runningReporters, root, name, config.reporters[name]);
    });
  }

  config.runAll = (config.runAll || false);
  config.filterTrace = (config.filterTrace || false);

  if (typeof config.showTrace === 'undefined') config.showTrace = false;

  dirs = [{path: config.testDir, matches: [new RegExp(config.testAppend + '\\.')]}];

  if (config.sourceDir !== false) dirs.push(config.sourceDir);

  console.log(dirs);

  root.watcher(dirs, {createDir: true}).then(
    function() {
      callback(null, {});
    },
    function(e) {
      callback(e);
    }
  );

  // root.recursor(dirs, {createDir: true}).then(
  //   function() {
  //     callback(null, {});
  //   },
  //   function(e) {
  //     callback(e);
  //   }
  // );
}

startReporter = function(runningReporters, root, name, config) {
  try {
    if (reporters[name]) {
      var Reporter = reporters[name];
      if (typeof runningReporters[name] === 'undefined') {
        runningReporters[name] = new Reporter(root, config);
      }
      runningReporters[name].start();
    } else {
      error('No such reporter \'%s\'', name);
    }
  } catch (e) {
    error('Problem starting reporter \'%s\'', name, e.stack);
  }
}
