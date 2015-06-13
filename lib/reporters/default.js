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
  , needNewline = false
  , beginning = true
  , lastPath
  , currentIndent = ''
  , currentTitle
  , dot = '․'
  , cross = '✖'
  , tick = '✓'
  , errors
  ;

if (process && process.platform === 'win32') {
  dot = '.';
  cross = '\u00D7';
  tick = '\u221A';
}


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
  
  if (beginning) console.log();

  errors = [];

  beginning = false;

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
  lastPath = [];
  if (typeof multiCounter == 'undefined') errors = [];
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

  if (args.test.node.skip) return next();

  var thisPath = args.test.node.path.reverse();
  var changeDepth = thisPath.length - 1;

  for (var i = 0; i < thisPath.length; i++) {
    if (thisPath[i] !== lastPath[i]) {
      changeDepth = i;
      break;
    }
  }

  currentIndent = '';
  for (var i = 0; i < changeDepth; i++) {
    currentIndent += '  ';
  }

  if (changeDepth == 0) console.log();

  for (var i = changeDepth; i < thisPath.length; i++) {
    var str = thisPath[i];
    if (i == thisPath.length - 1) {
      str = '  ' + str.grey + ' ';
    } else {
      str += EOL;
    }
    console._stdout.write(currentIndent + str);
    currentTitle = thisPath[i];
    currentIndent += '  ';
  }

  lastPath = thisPath;
  next();
}

module.exports.afterEach = function(args, next) {
  var counts = multiCounter ? multiCounter : counter;
  var testNode = args.test.node;

  console._stdout.clearLine();
  console._stdout.cursorTo(0);

  currentIndent = currentIndent.substr(0, currentIndent.length - 2);

  if (testNode.error) {
    counts.fail++;
    errors.push(args);
    console.log(currentIndent + (counts.fail + ') ' + currentTitle).red);
    // if (needNewline) console.log();
    // console.log('In test: '.bold + testNode.path.reverse().join(', '));
    // console.log(testNode.error.toString().red);
    // console.log(testNode.error.stack.split(EOL).slice(1,6).join(EOL));
    // console._stdout.write('*'.red);
    // needNewline = true;
  }
  else if (testNode.skip) {
    counts.skip++;
    // console._stdout.write('.'.red);
    // needNewline = true;
  } 
  else if (testNode.pend) {
    counts.pend++;
    console.log(currentIndent + ('- ' + currentTitle).cyan);
    // console._stdout.write('*'.cyan);
    // needNewline = true;
  } 
  else {
    counts.pass++;
    console.log(currentIndent + tick.green + ' ' + currentTitle.grey);
    // console._stdout.write('*'.green);
    // needNewline = true;
  }
  args.steps.forEach(function(step) {
    if (!step.startAt) return;
    if (step.type == 'test') counts.test += step.endAt - step.startAt;
    else counts.hook += step.endAt - step.startAt;
  });
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
    // if (dev.rootCount > 1) {
    //   report += name + ' ';
    // }
    // report += file + '\n';
  }
  var fail = 'fail: 0  '
    , pass = 'pass: 0  '
    , pend = 'pend: 0  '
    , skip = 'skip: 0  '

  if (counter.fail > 0) fail = ('fail: ' + counter.fail + '  ').red;
  if (counter.pass > 0) pass = ('pass: ' + counter.pass + '  ').green;
  if (counter.pend > 0) pend = ('pend: ' + counter.pend + '  ').cyan;
  if (counter.skip > 0) skip = ('skip: ' + counter.skip + '  ').red;

  report += fail + pass + pend + skip + 'hooks: ' + counter.hook + 'ms  tests: ' + counter.test + 'ms'
  if (dev.rootCount > 1 && !file) {
    report = '\n' + report + '  ' + name;
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
  if (needNewline) console.log();
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
