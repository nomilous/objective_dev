var roots = require('./index').roots
  , logger = objective.logger
  , TODO = logger.TODO
  , error = logger.error
  , warn = logger.warn
  , extname = require('path').extname
  , basename = require('path').basename
  , dirname = require('path').dirname
  , sep = require('path').sep
  , sequence = require('when/sequence')
  , promise = require('when').promise
  , compiler = require('./compiler')
  , pipeline = objective.pipeline
  , dev = require('./')
  ;

dev.runningMultiple = false;
pipeline.createEvent('objective.multiple.start');
pipeline.createEvent('objective.multiple.end');

module.exports.foundFile = function(args, next) {
  var root = roots[args.root.config.uuid];
  var detail, files;

  if (!(detail = module.exports.getDetail(args))) {
    // not source or test file
    return next();
  }

  // ensure type [source or test] is present on root
  root.files[detail.type] = (root.files[detail.type] || {})
  files = root.files[detail.type]
  if (!files[detail.file]) args.watch = true; // first encounter
                                             // tell recursor to
                                            // 'watch' the file
  if (detail.type == 'source') {
    files[detail.file] = detail;
    TODO('compile source on recurse found file');
  } 
  else if (detail.type == 'test') {
    files[detail.file] = detail;
  }
  next();
}

module.exports.endRecurse = function(args, next) {
  var root = roots[args.root.config.uuid];

  if (!args.path.match(new RegExp('^' + root.config.testDir)))
    return next()

  // got end of test dir recurse, 
  // run all accumulated tests.
  // (the recursor waits for next)

  dev.runningMultiple = true;
  return pipeline.emit('objective.multiple.start',{
      root: args.root
    },
    function(err, res) {
      if (err) error(err);
      sequence((function(){
        var functionArray = [];
        for(var file in root.files.test) {
          (function(file){
            functionArray.push(function(){
              return promise(function(resolve, reject) {
                root.root.loadChild(file).then(resolve, reject);
              });
            });
          })(file)
        }
        return functionArray;
      })( )).then(
        function(){
          dev.runningMultiple = false;
          return pipeline.emit('objective.multiple.end',{
              root: args.root,
              error: null
            },
            function(err, res) {
              if (err) error(err);
              next();
            }
          );
        },
        function(err){
          dev.runningMultiple = false;
          return pipeline.emit('objective.multiple.end',{
              root: args.root,
              error: err
            },
            function(e, res) {
              if (e) error(e);
              next(err);
            }
          );
        }
      );  
    }
  );
}

module.exports.changedFile = function(args, next) {
  var root = roots[args.root.config.uuid];
  var file = args.path;
  var detail;
  if (detail = root.files.test[file]) {
    if (!objective.currentChild) {
      // Changed file is a test, run it if no other child 
      // already running.
      return root.root.loadChild(file).then(
        function(result) {
          next();
        }, 
        next
      );
    }
    warn('Ignored %s, buzy.',file);
    return next();
  } else if (detail = root.files.source[file]) {
    // Changed file is source, needs compile depending on config
    // Then needs to run associated test, or test(s) per 
    // TODO uuid list of which tests in source head
    compiler.compile(root, root.files.source[file], args.options);
    
    var testFile = dirname(file.replace( new RegExp( '^'+root.config.sourceDir), root.config.testDir));
    testFile = testFile + sep + detail.base + root.config.testAppend
    if (!objective.currentChild) {
      return root.root.loadChild(testFile).then(
        function(result) {
          next();
        }, 
        next
      );
    }
    warn('Ignored %s, buzy.',testFile);
    return next();
  }
  next();
}

module.exports.getDetail = function(args) {
  var root = roots[args.root.config.uuid];
  var config = root.config;
  var testDir = config.testDir;
  var testAppend = config.testAppend;
  var sourceDir = config.sourceDir;
  var file = args.path;
  var ext, base;

  // TODO, support all in require.extensions

  if (!file.match(/\.js$/) && !file.match(/\.coffee$/))
    return false

  ext = extname(file);
  base = basename(file, ext);

  if (file.match(new RegExp('^'+testDir))) {
    if (testAppend.length == 0)
      return {
        type: 'test',
        base: base,
        ext: ext,
        file: file
      };
    if (base.match(new RegExp(testAppend+'$'))) {
      return {
        type: 'test',
        base: base,
        ext: ext,
        file: file
      }
    }
  } else if (file.match(new RegExp('^'+sourceDir + sep))) {
    return {
      type: 'source',
      base: base,
      ext: ext,
      file: file
    }
  }
  
  return false;
}
