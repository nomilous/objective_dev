var pipeline = objective.pipeline
  , EOL = require('os').EOL
  , dev = require('../')
  , colors = require('colors')
  , sep = require('path').sep
  ;

module.exports = Reporter = function() {
  this.running = false;
  this.beginning = true;
}

Reporter.dot = '․';
Reporter.tick = '✓';
Reporter.cross = '✖';

if (process && process.platform === 'win32') {
  Reporter.dot = '.';
  Reporter.cross = '\u00D7';
  Reporter.tick = '\u221A';
}


Reporter.prototype.start = function(root, config) {
  if (this.running) return;
  this.running = true;
  pipeline.on('objective.multiple.start', {context: this}, this.startMultiple);
  pipeline.on('objective.multiple.end',   {context: this}, this.endMultiple);
  pipeline.on('dev.test.before.all',      {context: this}, this.beforeAll);
  pipeline.on('dev.test.before.each',     {context: this}, this.beforeEach);
  pipeline.on('dev.test.after.each',      {context: this}, this.afterEach);
  pipeline.on('dev.test.after.all',       {context: this}, this.afterAll);
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

Reporter.prototype.startMultiple = function(args, next) {
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

Reporter.prototype.endMultiple = function(args, next) {
  if (!this.cancelled) this.report(args, this.multiCounter);
  multiCounter = void 0;
  next();
}

Reporter.prototype.beforeAll = function(args, next) {
  this.lastPath = [];
  if (typeof this.multiCounter == 'undefined') this.errors = [];
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

Reporter.prototype.beforeEach = function(args, next) {
  next();
}

Reporter.prototype.afterEach = function(args, next) {
  var counts = this.multiCounter ? this.multiCounter : this.counter;
  var testNode = args.test.node;

  if (testNode.error) {
    counts.fail++;
    this.errors.push(args);
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

Reporter.prototype.afterAll = function(args, next) {
  if (args.error) {
    // testrun was cut short, probably exception / timeout in hook
    this.cancelled = true;
    console.log({EEE: args.error});
    // module.exports.showError(cancelled, args.error, args);
    return next();
  }
  if (this.multiCounter) return next();
  this.report(args, counter, args.config.filename);
  next();
}

Reporter.prototype.report = function(args, counter, file) {
  var name = this.getName(args);
  var report = '';
  if (file) {
    report = EOL;
  }
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

  console.log(report);

  this.showErrors(args);
}

Reporter.prototype.showErrors = function(args) {
  for (var i = 0; i < this.errors.length; i++) {
    var file = this.errors[i].test.node.info.file;
    file = file.replace(process.cwd() + sep, '');
    file += ':' + this.errors[i].test.node.info.line + ':' + this.errors[i].test.node.info.colm;
    var place = (i+1) + ') ';
    var space = '             '.substr(0, place.length) 
    console.log(EOL + place + this.errors[i].test.node.path.join(' - '));
    console.log(space + file.grey);
    console.log(space + this.errors[i].test.node.error.toString().red);
    if (dev.roots[args.root.config.uuid].config.fullTrace) {
      var stack = this.errors[i].test.node.error.stack.split(EOL);
      stack.shift();
      stack = stack.map(function(line) {
        return line.replace(/^\s\s/, space)
      });
      console.log(stack.join(EOL).grey);
    }
  }
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


