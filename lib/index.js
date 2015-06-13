module.exports.$$name = 'dev';

var roots;

module.exports.roots = roots = {};

var runningReporters = {}
  , reporters = require('./reporters')
  , pipeline = objective.pipeline
  , commands = require('./commands')
  , handler = require('./handler')
  , tester = require('./tester')
  , error = objective.logger.error
  ;

module.exports.reporters = reporters;
module.exports.expector = require('./tester/expector');
module.exports.injector = require('./tester/injector');
module.exports.errors = require('./errors');

pipeline.on('prompt.commands.register.ask', commands.register);
pipeline.on('files.recurse.found', handler.foundFile);
pipeline.on('files.recurse.end', handler.endRecurse);
pipeline.on('files.recurse.changed', handler.changedFile);

pipeline.on('objective.starting', tester.onStarting);
pipeline.on('objective.not.promised', tester.onNotPromised);
pipeline.on('objective.run.error', tester.onError);
pipeline.on('objective.empty', tester.onEmpty);


// eg. Starting listen on unavailable socket
//     and not using on('error') 
process.on('uncaughtException', function(e) {
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

module.exports.create = function(root, config, callback) {
  // keep track of all roots that initialize this plugin
  if (roots[root.config.uuid]) {
    console.log('\n\n\n...m........ultiple objectives with uuid \'' + root.config.uuid + '\'\n\n');
    process.exit(1);
  }
  roots[root.config.uuid] = {
    root: root,
    config: config,
    files: {
      test: {},
      source: {}
    }
  }

  // apply defaults to config where null

  config.testDir = (config.testDir || 'test');
  if (config.testAppend !== '')
    config.testAppend = (config.testAppend || '_test');
  config.sourceDir = (config.sourceDir || 'lib');
  // null compileTo means dont,
  // source and test dir files are watched (from the recurse)
  if (typeof config.reporter === 'undefined')
    // if (typeof config.reporters === 'undefined')
      config.reporter = 'Default';

  if (config.reporter) {
    try {
      if (typeof config.reporter === 'string') {
        if (reporters[config.reporter]) {
          var Reporter = reporters[config.reporter];
          if (typeof runningReporters[config.reporter] === 'undefined') {
            runningReporters[config.reporter] = new Reporter();
          }
          // called to start once per running root
          runningReporters[config.reporter].start(root, {});
          
        } else {
          error('No such test reporter \'%s\'', config.reporter);
        }
      }
    } catch (e) {
      error('Problem starting reporter \'%s\'',config.reporter, e.stack);
    }
  }

  if (typeof config.reporters === 'object') {
    for (var name in config.reporters) {
      reporterConfig = config.reporters[name];
      if (reporters[name]) {
        try {
          reporters[name].start(root, reporterConfig);
        } catch(e) {
          error('Problem starting reporter %s',name, e.stack);
        }
      } else {
        error('No such test reporter \'%s\'', name);
      }
    }
  }

  config.runAll = (config.runAll || false);

  if (typeof config.fullTrace === 'undefined') config.fullTrace = false;

  callback(null, {});
}
