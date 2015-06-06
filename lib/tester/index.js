var walker = require('./walker')
  , logger = objective.logger
  , error = logger.error
  , warn = logger.warn
  , debug = logger.createDebug('tester')
  ;

module.exports.onStarting = function(args, next) {
  debug('starting', args);
  walker.reset(args);
  next();
}

module.exports.onNotPromised = function(args, next) {
  debug('not promised', args);
  warn('In \''+args.root.config.title+'\' - Missing promise in %s', args.config.filename);
  next();
}

module.exports.onError = function(args, next) {
  debug('error', args);
  error('Objective errored!', args.error.stack); // stacks?, 
                                               // different flavour stack
  args.error = null; // don't take down the recursor/watcher
  next();
}

module.exports.onEmpty = function(args, next) {
  debug('empty', args);
  warn('In \''+args.root.config.title+'\' - Empty test %s', args.config.filename);
  next();
}
