var pipeline = objective.pipeline
  , EOL = require('os').EOL
  , dev = require('../')
  , colors = require('colors')
  , sep = require('path').sep
  , dirname = require('path').dirname
  , HookError = require('../errors').HookError
  , diff = require('diff')
  , sep = require('path').sep
  , relative = require('path').relative
  ;

module.exports = Reporter = function(root, config) {
  this.running = false;
  this.failures = [];
  var _this = this;
  this.startMultiple = function(args, next) {
    // multiple possible roots, multiple possible reporters,
    // so ensure this event is for this reporters root
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
  console.log()
  this.failures = [];
  this.multiCounter = { ////// really need two counters?
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
  if (!this.cancelled) this.doReport(args, this.multiCounter);
  multiCounter = void 0;
  next();
}

Reporter.prototype.onBeforeAll = function(args, next) {
  this.lastPath = [];
  if (!dev.roots[args.root.config.uuid].config.runAll) {
    if (typeof this.multiCounter == 'undefined') this.failures = [];
  }
  // if (typeof this.multiCounter == 'undefined') this.failures = [];
  this.cancelled = false;
  this.counter = { ////// really need two counters?
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
      if (this.failures.length == 0) this.failures.push(args)
      else {
        var previousError = this.failures[this.failures.length-1].test.node.error;
        if (previousError.name == 'HookError') {
          if (previousError.cancelled.atStep.node.id != testNode.error.cancelled.atStep.node.id) {
            this.failures.push(args);
          } else {
            previousError.affected++;
          }
        } else {
          this.failures.push(args);
        }
      }
    } else if(testNode.error.name == 'GlobalError') { //almost repeating
      if (typeof testNode.error.affected === 'undefined') testNode.error.affected = 1
      if (this.failures.length == 0) this.failures.push(args)
      else {
        var previousError = this.failures[this.failures.length-1].test.node.error;
        if (previousError.name == 'GlobalError') {
          if (previousError.treeId != testNode.error.treeId) {
            this.failures.push(args);
          } else {
            previousError.affected++;
          }
        } else {
          this.failures.push(args);
        }
      }
    } else {
      this.failures.push(args);
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
  this.doReport(args, this.counter, args.config.filename);
  next();
}

Reporter.prototype.doReport = function(args, counter, file) {
  var name = this.getName(args);
  this.showMetrics(args, counter, file, name);
  this.showFailures(args, this.failures, true);
  delete this.multiCounter;
  delete this.counter;
}

Reporter.prototype.showMetrics = function(args, counter, file, name) {
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

}

Reporter.prototype.showFailures = function(args, failures, local) {

  /*
   * local - true  - means got full args in failures
   *         false - got only test.node in failures
   */

  for (var i = 0; i < failures.length; i++) {
    var showTrace = dev.roots[args.root.config.uuid].config.showTrace;
    var filterTrace = dev.roots[args.root.config.uuid].config.filterTrace;
    var test = failures[i].test;
    var error = test.node.error;
    var place;
    var indent;
    if (local) {
      place = (i+1) + ') ';
      indent = '              '.substr(0, place.length);
    } else {
      place = '??)'.red + ' ';
      indent = '    ';
    }
    var file, info;
    var str;
    if (error.step && error.step.type != 'test') str = error.step ? error.step.str : undefined;
    // TODO: show file location as failing line in test if known 
    if (error.name == 'HookError') {
      info = error.cancelled.atStep.info;
      file = info.file;
      file = file.replace(process.cwd() + sep, '');
      file += ':' + info.line + ':' + info.colm;
      console.log(place + error.message + ' for %d tests.', error.affected);
      console.log(indent + 'at (%s)'.grey, file);
      error = error.cancelled.error;
      console.log(indent + error.toString().red + (str ? ' (' + str + ') ' : ''));
    } else if(error.name == 'GlobalError') {
      str = error.step ? error.step.str : undefined;
      info = test.node.info;
      file = info.file;
      file = file.replace(process.cwd() + sep, '');
      console.log(place + error.name + ' in %d tests.', error.affected);
      console.log(indent + 'at (%s)'.grey, file);
      console.log(indent + error.error.toString().red + (str ? ' (' + str + ') ' : ''));
      error = error.error;
    } else {
      info = test.node.info;
      file = info.file;
      file = file.replace(process.cwd() + sep, '');
      file += ':' + info.line + ':' + info.colm;
      console.log(place + test.node.path.join(' - '));
      console.log(indent + 'at (%s)'.grey, file);
      console.log(indent + error.toString().red + (str ? ' (' + str + ') ' : ''));
    }

    if (this['on' + error.name]) {
      this['on' + error.name].call(this, args, error, indent);
    }

    filterTrace = this.overrideFilterTrace(args, failures[i], filterTrace);
    if (typeof filterTrace !== 'undefined') showTrace = true
    else if (filterTrace === 'no_trace') showTrace = false;
    if (showTrace || filterTrace) {
      console.log();
      this.showStackTrace(args, filterTrace, error, indent, 0);
    }
    console.log('\n');
  }
}

Reporter.prototype.overrideFilterTrace = function(args, failure, original) {
  var recurse = function(node) {
    if (typeof node.filterTrace !== 'undefined') {
      return node.filterTrace;
    }
    if (node.parent) return recurse(node.parent);
    return original;
  }
  return recurse(failure.test.node);
}

Reporter.prototype.showStackTrace = function(args, filterTrace, error, indent, shift, perFrameFn) {

  var home, config, origPrep, stack, frames, regex, i, rootIndex;
  home = args.root.home;
  config = dev.roots[args.root.config.uuid].config;
  rootIndex = this.whichRoot(args);

  origPrep = Error.prepareStackTrace;
  Error.prepareStackTrace = function(e, stack){
    frames = stack;
    return origPrep(e, stack);
  }
  stack = error.stack.split(EOL);
  Error.prepareStackTrace = origPrep;

  stack.shift();
  for (i = 0; i < shift; i++) {
    stack.shift();
    frames.shift();
  }
  frames = this.expandFrames(frames);

  if (!frames) {
    // something else already rendered the error stack with alternative prepper,
    // cant get frames.

    
    stack = stack.map(function(line) {
      var match;
      if (match = line.match(/\((.*):(.*):(.*)\)/)) {
        file = relative(process.cwd(), match[1]);
        line = line.replace(match[1] + ':' + match[2] + ':' + match[3], file  + ':' + match[2] + ':' + match[3]);
        // console.log(line);
      }
      return line;
    });
    if (!filterTrace) {
      console.log(stack.join(EOL).grey);
      return;
    }

    stack = stack.filter(function(line) {
      return line.indexOf('node_modules') < 0 && line.indexOf(sep) > -1
    });
    console.log(stack.join(EOL).grey);
    return;
  }

  i = 0;
  stack.forEach(function(line) {
    line = line.trim();
    if (line == '') return;
    line = line.replace(/^at\s/, 'at ' + i + ' ');
    var frame = frames[i];
    var path = relative(process.cwd(), frame.FileName);
    line = line.replace(frame.FileName, path);
    if (!line.match(/\(/)) {
      line = line.replace(
        path + ':' + frame.LineNumber + ':' + frame.ColumnNumber, 
        '(' + path + ':' + frame.LineNumber + ':' + frame.ColumnNumber + ')'
      );
    }
    if (filterTrace) {

                                                                        // include local node modules
      if (path.indexOf('node_modules') == -1 && path.indexOf(sep) != -1 /* && path.indexOf(home + sep + 'node_modules') == -1 */) {
        if (typeof perFrameFn == 'function') {
          perFrameFn(frame, line, i);
        } else console.log(indent + line.grey);
      } 
    } else {
      if (typeof perFrameFn == 'function') {
        perFrameFn(frame, line, i);
      } else console.log((indent + line).grey);
    }
    i++;
  });
}

Reporter.prototype.expandFrames = function(frames) {
  // console.log(frames);
  if (frames && typeof frames.map == 'function') {
    return frames.map(function(frame) {
      var f = {};
      try {
        f.This = frame.getThis();
      } catch(e) {} 
      try {
        f.TypeName = frame.getTypeName();
      } catch(e) {} 
      try {
        f.Function = frame.getFunction();
      } catch(e) {} 
      try {
        f.FunctionName = frame.getFunctionName();
      } catch(e) {} 
      try {
        f.MethodName = frame.getMethodName();
      } catch(e) {} 
      try {
        f.FileName = frame.getFileName();
      } catch(e) {} 
      try {
        f.LineNumber = frame.getLineNumber();
      } catch(e) {} 
      try {
        f.ColumnNumber = frame.getColumnNumber();
      } catch(e) {} 
      try {
        f.EvalOrigin = frame.getEvalOrigin();
      } catch(e) {} 
      try {
        f.isToplevel = frame.isToplevel();
      } catch(e) {} 
      try {
        f.isEval = frame.isEval();
      } catch(e) {} 
      try {
        f.isNative = frame.isNative();
      } catch(e) {} 
      try {
        f.isConstructor = frame.isConstructor();
      } catch(e) {} 
      return f;
    });
  }
  return null;
} 

Reporter.prototype.onError = function(args, error, indent) {
  console.log();
  console.log(indent + 'todo:', 'onError'.red);
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
    return true;
  }
  return false;
}

Reporter.prototype.onInjectionError = function(args, error, indent) {
  console.log();
  console.log(indent + 'todo:', 'onInjectionError'.red);
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

Reporter.prototype.whichRoot = function(args) {
  for (var i = 0; i < objective.roots.length; i++) {
    if (objective.roots[i].config.uuid == args.root.config.uuid) return i;
  }
}


