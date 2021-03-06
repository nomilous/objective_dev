var Reporter = require('./').Reporter
  , EOL = require('os').EOL
  , colors = require('colors')
  , format = require('util').format
  ;

module.exports = Default = function(root, config) {
  Reporter.apply(this, arguments);
  this.lastPath = [];
}

Object.keys(Reporter.prototype).forEach(function(fn) {
  Default.prototype[fn] = Reporter.prototype[fn];
});

Default.prototype.constructor = Default;

Default.prototype.onBeforeAll = function(args, next) {
  Reporter.prototype.onBeforeAll.call(this, args, function(){});
  // console.log();
  next();
}


Default.prototype.onBeforeEach = function(args, next) {

  Reporter.prototype.onBeforeEach.call(this, args, function(){});
  this.currentIndent = '  ';
  if (args.test.node.skip) return next();

  var thisPath = args.test.node.path;
  var changeDepth = thisPath.length - 1;
  for (var i = 0; i < thisPath.length; i++) {
    if (thisPath[i] !== this.lastPath[i]) {
      changeDepth = i;
      break;
    }
  }

  this.currentIndent = '  ';
  for (var i = 0; i < changeDepth; i++) {
    this.currentIndent += '  ';
  }

  if (changeDepth == 0) console.log();

  for (var i = changeDepth; i < thisPath.length; i++) {
    var str = thisPath[i];
    if (i == thisPath.length - 1) {
      str = '  ' + (str + '... ').bold;
      // str = '  ' + ('it ' + str + '... ').bold;
      // thisPath[i] = 'it ' + thisPath[i];
    } else {
      str += EOL;
    }
    console._stdout.write(this.currentIndent + str);
    // console._stdout.cursorTo(0);
    this.currentTitle = thisPath[i];
    this.currentIndent += '  ';
  }

  this.lastPath = thisPath;
  next();
}

Default.prototype.onAfterEach = function(args, next) {
  Reporter.prototype.onAfterEach.call(this, args, function(){});

  var counts = this.multiCounter ? this.multiCounter : this.counter;
  var testNode = args.test.node;


  // Repeated from tester/counter
  var hookTime = 0;
  var testTime = 0;
  args.steps.forEach(function(step) {
    if (!step.startAt) return;
    if (step.type == 'test') testTime += step.endAt - step.startAt;
    else hookTime += step.endAt - step.startAt;
  });
  var times = format(' (%sms,%sms)', hookTime, testTime);

  console._stdout.clearLine();
  console._stdout.cursorTo(0);

  this.currentIndent = this.currentIndent.substr(0, this.currentIndent.length - 2);

  if (testNode.error && !testNode.skip) {
    console.log(this.currentIndent + (this.failures.length + ') ' + this.currentTitle).red + times.grey);
  }
  else if (testNode.skip) {
    // skip ahead of pend - log nothing
  }
  else if (testNode.pend) {
    console.log(this.currentIndent + ('- ' + this.currentTitle).cyan);
  } 
  else {
    console.log(this.currentIndent + Reporter.tick.green + ' ' + this.currentTitle.grey + times.grey);
  }
  next();
}
