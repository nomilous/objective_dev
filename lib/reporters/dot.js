var Reporter = require('./').Reporter
  , colors = require('colors')
  ;

module.exports = Dot = function() {
  Reporter.apply(this, arguments);
}

Object.keys(Reporter.prototype).forEach(function(fn) {
  Dot.prototype[fn] = Reporter.prototype[fn];
});

Dot.prototype.constructor = Dot;

Dot.prototype.afterEach = function(args, next) {
  Reporter.prototype.afterEach.call(this, args, function(){});
  var testNode = args.test.node;
  if (testNode.error) {
    console._stdout.write('*'.red);
  } else if (testNode.pend) {
    console._stdout.write(Reporter.dot.cyan);
  } else if (testNode.skip) {
    console._stdout.write(Reporter.dot.red);
  } else {
    console._stdout.write('*'.green);
  }
  next();
}
