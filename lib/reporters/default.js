var Reporter = require('./').Reporter
  , EOL = require('os').EOL
  , colors = require('colors')
  ;

module.exports = Default = function() {
  Reporter.apply(this, arguments);
  this.lastPath = [];
}

Object.keys(Reporter.prototype).forEach(function(fn) {
  Default.prototype[fn] = Reporter.prototype[fn];
});

Default.prototype.constructor = Default;


Default.prototype.beforeEach = function(args, next) {
  Reporter.prototype.beforeEach.call(this, args, function(){});
  if (args.test.node.skip) return next();

  var thisPath = args.test.node.path;
  var changeDepth = thisPath.length - 1;
  for (var i = 0; i < thisPath.length; i++) {
    if (thisPath[i] !== this.lastPath[i]) {
      changeDepth = i;
      break;
    }
  }

  this.currentIndent = '';
  for (var i = 0; i < changeDepth; i++) {
    this.currentIndent += '  ';
  }

  if (changeDepth == 0) console.log();

  for (var i = changeDepth; i < thisPath.length; i++) {
    var str = thisPath[i];
    if (i == thisPath.length - 1) {
      str = '  ' + (str + '... ').bold;
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

Default.prototype.afterEach = function(args, next) {
  Reporter.prototype.afterEach.call(this, args, function(){});

  var counts = this.multiCounter ? this.multiCounter : this.counter;
  var testNode = args.test.node;

  console._stdout.clearLine();
  console._stdout.cursorTo(0);

  this.currentIndent = this.currentIndent.substr(0, this.currentIndent.length - 2);

  if (testNode.error) {
    console.log(this.currentIndent + (this.errors.length + ') ' + this.currentTitle).red);
  }
  else if (testNode.skip) {
    // skip ahead of pend - log nothing
  }
  else if (testNode.pend) {
    console.log(this.currentIndent + ('- ' + this.currentTitle).cyan);
  } 
  else {
    console.log(this.currentIndent + Reporter.tick.green + ' ' + this.currentTitle.grey);
  }
  next();
}
