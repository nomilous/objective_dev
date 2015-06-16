module.exports = {
  description: '(dev) compile line of coffee-script',
  run: function(args, callback) {
    try {
      line = args.join(' ');
      line = objective.coffee.compile(line,{bare:true});
      console.log();
      console.log(line);
      callback();
    } catch (e) {
      objective.logger.error(e);
      callback();
    }
  }
}
