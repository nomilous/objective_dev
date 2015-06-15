// BUG - running more than one reporter type is a problem

var pipeline = objective.pipeline
  , EOL = require('os').EOL
  , dev = require('../')
  , colors = require('colors')
  , sep = require('path').sep
  , HookError = require('../errors').HookError
  , diff = require('diff')
  ;

module.exports = Reporter = function(root, config) {
  this.running = false;
  this.beginning = true;
  var _this = this;
  this.startMultiple = function(args, next) {
    if (args.root.config.uuid !== root.config.uuid) return next();
    _this.onStartMultiple.call(_this, args, next);
  }
  this.endMultiple = function(args, next) {
    if (args.root.config.uuid !== root.config.uuid) return next();
    _this.onEndMultiple.call(_this, args, next);
  }
  this.beforeAll = function(args, next) {
    if (args.root.config.uuid !== root.config.uuid) return next();
    _this.onBeforeAll.call(_this, args, next);
  }
  this.beforeEach = function(args, next) {
    if (args.root.config.uuid !== root.config.uuid) return next();
    _this.onBeforeEach.call(_this, args, next);
  }
  this.afterEach = function(args, next) {
    if (args.root.config.uuid !== root.config.uuid) return next();
    _this.onAfterEach.call(_this, args, next);
  }
  this.afterAll = function(args, next) {
    if (args.root.config.uuid !== root.config.uuid) return next();
    _this.onAfterAll.call(_this, args, next);
  }
}

Reporter.dot = '․';
Reporter.tick = '✓';
Reporter.cross = '✖';

if (process && process.platform === 'win32') {
  Reporter.dot = '.';
  Reporter.cross = '\u00D7';
  Reporter.tick = '\u221A';
}

Reporter.prototype.start = function() {
  if (this.running) return;
  this.running = true;
  pipeline.on('objective.multiple.start',  this.startMultiple);
  pipeline.on('objective.multiple.end',    this.endMultiple);
  pipeline.on('dev.test.before.all',       this.beforeAll);
  pipeline.on('dev.test.before.each',      this.beforeEach);
  pipeline.on('dev.test.after.each',       this.afterEach);
  pipeline.on('dev.test.after.all',        this.afterAll);
}

Reporter.prototype.stop = function() {
  pipeline.off('objective.multiple.start', this.startMultiple);
  pipeline.off('objective.multiple.end',   this.endMultiple);
  pipeline.off('dev.test.before.all',      this.beforeAll);
  pipeline.off('dev.test.before.each',     this.beforeEach);
  pipeline.off('dev.test.after.each',      this.afterEach);
  pipeline.off('dev.test.after.all',       this.afterAll);
  this.running = false;
}

Reporter.prototype.onStartMultiple = function(args, next) {
  if (this.beginning) console.log();
  this.errors = [];
  this.beginning = false;
  this.multiCounter = {
    pass: 0,
    fail: 0,
    skip: 0,
    pend: 0,
    test: 0,
    hook: 0
  };
  next();
}

Reporter.prototype.onEndMultiple = function(args, next) {
  if (!this.cancelled) this.report(args, this.multiCounter);
  multiCounter = void 0;
  next();
}

Reporter.prototype.onBeforeAll = function(args, next) {
  this.lastPath = [];
  if (!dev.roots[args.root.config.uuid].config.runAll) this.errors = [];
  // if (typeof this.multiCounter == 'undefined') this.errors = [];
  this.cancelled = false;
  this.counter = {
    pass: 0,
    fail: 0,
    skip: 0,
    pend: 0,
    test: 0,
    hook: 0
  };
  next();
}

Reporter.prototype.onBeforeEach = function(args, next) {
  next();
}

Reporter.prototype.onAfterEach = function(args, next) {
  var counts = this.multiCounter ? this.multiCounter : this.counter;
  var testNode = args.test.node;

  if (testNode.error) {
    counts.fail++;
    // if (testNode.error instanceof HookError) { // ?
    if (testNode.error.name == 'HookError') {
      if (typeof testNode.error.affected === 'undefined') testNode.error.affected = 1
      if (this.errors.length == 0) this.errors.push(args)
      else {
        var previousError = this.errors[this.errors.length-1].test.node.error;
        if (previousError.name == 'HookError') {
          if (previousError.cancelled.atStep.node.id != testNode.error.cancelled.atStep.node.id) {
            this.errors.push(args);
          } else {
            previousError.affected++;
          }
        } else {
          this.errors.push(args);
        }
      }
    } else {
      this.errors.push(args);
    }
  }
  else if (testNode.skip) counts.skip++
  else if (testNode.pend) counts.pend++
  else counts.pass++;
  
  args.steps.forEach(function(step) {
    if (!step.startAt) return;
    if (step.type == 'test') counts.test += step.endAt - step.startAt;
    else counts.hook += step.endAt - step.startAt;
  });
  next();
}

Reporter.prototype.onAfterAll = function(args, next) {
  if (this.multiCounter) return next();
  if (dev.roots[args.root.config.uuid].config.runAll) return next();
  this.report(args, this.counter, args.config.filename);
  next();
}

Reporter.prototype.report = function(args, counter, file) {
  var name = this.getName(args);
  var report = '';

  var fail = 'fail: 0  '
    , pass = 'pass: 0  '
    , pend = 'pend: 0  '
    , skip = 'skip: 0  '

  if (counter.fail > 0) fail = ('fail: ' + counter.fail + '  ').red;
  if (counter.pass > 0) pass = ('pass: ' + counter.pass + '  ').green;
  if (counter.pend > 0) pend = ('pend: ' + counter.pend + '  ').cyan;
  if (counter.skip > 0) skip = ('skip: ' + counter.skip + '  ').red;

  report += '  ' + fail + pass + pend + skip + 'hooks: ' + counter.hook + 'ms  tests: ' + counter.test + 'ms'
  if (dev.rootCount > 1 && !file) {
    report = EOL + report + '  ' + name;
  }

  console.log();
  console.log(report);
  console.log();

  delete this.multiCounter;
  delete this.counter;

  this.showErrors(args);
}

Reporter.prototype.showErrors = function(args) {
  for (var i = 0; i < this.errors.length; i++) {
    var fullTrace = dev.roots[args.root.config.uuid].config.fullTrace;
    var test = this.errors[i].test;
    var error = test.node.error;
    var place = (i+1) + ') ';
    var indent = '             '.substr(0, place.length);
    var file, info;
    if (error.name == 'HookError') {
      info = error.cancelled.atStep.info;
      file = info.file;
      file = file.replace(process.cwd() + sep, '');
      file += ':' + info.line + ':' + info.colm;
      console.log(place + error.message + ' (%d tests affected)'.red, error.affected);
      console.log(indent + file.grey);
      error = error.cancelled.error;
      console.log(indent + error.toString().red);
    } else {
      info = test.node.info;
      file = info.file;
      file = file.replace(process.cwd() + sep, '');
      file += ':' + info.line + ':' + info.colm;
      console.log(place + test.node.path.join(' - '));
      console.log(indent + file.grey);
      console.log(indent + error.toString().red);
    }

    if (this['on' + error.name]) {
      this['on' + error.name].call(this, args, error, indent);
    }

    if (fullTrace) {
      var stack = error.stack.split(EOL);
      stack.shift();
      stack = stack.map(function(line) {
        return line.replace(/^\s\s/, space)
      });
      console.log(stack.join(EOL).grey);
    }
    console.log();
  }
}

Reporter.prototype.onError = function(args, error, indent) {

}

Reporter.prototype.onAssertionError = function(args, error, indent) {
  if (typeof error.expected == 'object') {
    console.log(indent + 'expected'.green, 'actual'.red, 'ok');
    console.log();
    diff.diffJson(error.actual, error.expected).forEach(function(part) {
      var color = part.added  ? 'green' : part.removed ? 'red' : null
      var spacer = indent + ' '
      part.value.split(EOL).forEach(function(line) {
        if (line == '') return;
        if (color) {
          console.log((spacer + line)[color]);
        } else {
          console.log(spacer + line);
        }
      });
    });
  }
}

Reporter.prototype.onExpectationError = function(args, error, indent) {
  console.log();
  console.log(indent + 'todo:', 'onExpectationError'.red);
}

Reporter.prototype.onConfigurationError = function(args, error, indent) {
  console.log();
  console.log(indent + 'todo:', 'onConfigurationError'.red);
}

Reporter.prototype.onOverdoneError = function(args, error, indent) {
  console.log();
  console.log(indent + 'todo:', 'onOverdoneError'.red);
}


Reporter.prototype.getName = function(args) {
  try {
    var p = JSON.parse(fs.readFileSync(args.root.home + sep + 'package.json'));
    name = p.name + '-' + p.version;
    return '[' + name + ']';
  } catch (e) {}
  if (args.root.config.codename) return '(' + args.root.config.codename + ')';
  return '(' + args.root.config.title + ')';
}


