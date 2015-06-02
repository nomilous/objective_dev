var pipeline = objective.pipeline
  , running = false
  , multiCounter
  , counter
  , dev = require('../')
  , colors = require('colors')
  , EOL = require('os').EOL
  , fs = require('fs')
  , sep = require('path').sep
  , cancelled
  ;


module.exports.start = function(root, config) {
  
  if (running) return;

  running = true;

  pipeline.on('objective.multiple.start', module.exports.startMultiple);
  pipeline.on('objective.multiple.end', module.exports.endMultiple);

  pipeline.on('dev.test.before.all', module.exports.beforeAll);
  pipeline.on('dev.test.before.each', module.exports.beforeEach);
  pipeline.on('dev.test.after.each', module.exports.afterEach);
  pipeline.on('dev.test.after.all', module.exports.afterAll);

}

module.exports.stop = function() {

  pipeline.off('objective.multiple.start', module.exports.startMultiple);
  pipeline.off('objective.multiple.end', module.exports.endMultiple);

  pipeline.off('dev.test.before.all', module.exports.beforeAll);
  pipeline.off('dev.test.before.each', module.exports.beforeEach);
  pipeline.off('dev.test.after.each', module.exports.afterEach);
  pipeline.off('dev.test.after.all', module.exports.afterAll);

  running = false;

}

module.exports.startMultiple = function(args, next) {
  
  multiCounter = {
    pass: 0,
    fail: 0,
    skip: 0,
    pend: 0,
    test: 0,
    hook: 0
  };

  next();
}

module.exports.endMultiple = function(args, next) {
  if (!cancelled) module.exports.report(args, multiCounter);
  multiCounter = void 0;
  next();
}

module.exports.beforeAll = function(args, next) {
  cancelled = false;
  counter = {
    pass: 0,
    fail: 0,
    skip: 0,
    pend: 0,
    test: 0,
    hook: 0
  };
  next();
}

module.exports.beforeEach = function(args, next) {
  next();
}

module.exports.afterEach = function(args, next) {
  var counts = multiCounter ? multiCounter : counter;
  var testNode = args.test.node;
  if (testNode.error) {
    console.log(testNode.error.toString());
    counts.fail++;
    console._stdout.write('*'.red);
  }
  else if (testNode.skip) {
    counts.skip++;
    console._stdout.write('.'.cyan);
  } 
  else if (testNode.pend) {
    counts.pend++;
    console._stdout.write('.'.yellow);
  } 
  else {
    counts.pass++;
    console._stdout.write('*'.green);
  }
  next();
}

module.exports.afterAll = function(args, next) {
  if (args.error) {
    // testrun was cut short, probably exception / timeout in hook
    cancelled = true;
    module.exports.showError(cancelled, args.error, args);
    return next();
  }
  if (multiCounter) return next();
  module.exports.report(args, counter, args.config.filename);
  next();
}

module.exports.report = function(args, counter, file) {
  var name = module.exports.getName(args);

  var report = ''; //  = '\n';
  if (file) {
    report = '\n';
    if (dev.rootCount > 1) {
      report += name + ' ';
    }
    report += file + '\n';
  }
  var fail = 'fail: 0  '
    , pass = 'pass: 0  '
    , skip = 'skip: 0  '
    , pend = 'pend: 0  '

  if (counter.fail > 0) fail = ('fail: ' + counter.fail + '  ').red.bold;
  if (counter.pass > 0) pass = ('pass: ' + counter.pass + '  ').green.bold;
  if (counter.skip > 0) skip = ('skip: ' + counter.skip + '  ').cyan.bold;
  if (counter.pend > 0) pend = ('pend: ' + counter.pend + '  ').yellow.bold;

  report += fail + pass + skip + pend + 'hooks: ' + counter.hook + 'ms  tests: ' + counter.test + 'ms'
  if (dev.rootCount > 1 && !file) {
    report = '\n' + name + ' ' + report;
  }

  console.log(report);
}

module.exports.getName = function(args) {
  try {
    var p = JSON.parse(fs.readFileSync(args.root.home + sep + 'package.json'));
    name = p.name + '-' + p.version;
    return '[' + name + ']';
  } catch (e) {}
  if (args.root.config.codename) return '(' + args.root.config.codename + ')';
  return '(' + args.root.config.title + ')';
}

module.exports.showError = function(cancelled, err, args) {
  if (err.name === 'HookError') {
    console.log(err.toString().bold);
    console.log(err.error.toString().red);
    console.log(err.error.stack.split(EOL).slice(1,6).join(EOL));
    if (cancelled) console.log('Cancelled run!'.bold.red + ' in \'' + args.root.config.title + '\', ' + args.config.filename);
    return;
  }
  else if (err.name === 'TimeoutError') {
    console.log(err.toString().red.bold);
    console.log(err.stack.split(EOL).slice(1,6).join(EOL));
    if (cancelled) console.log('Cancelled run!'.bold.red + ' in \'' + args.root.config.title + '\', ' + args.config.filename);
    return;
  }
  else {
    console.log(err.toString().red);
    console.log(err.stack.split(EOL).slice(1,6).join(EOL));
    if (cancelled) console.log('Cancelled run!'.bold.red + ' in \'' + args.root.config.title + '\', ' + args.config.filename);
  }
}
