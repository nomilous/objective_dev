var roots = require('./index').roots
  , prepend = process.env.OBJECTIVE_DEV_PREPEND || ''
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
  , fs = require('fs')
  , dev = require('./')
  ;

dev.runningMultiple = false;
pipeline.createEvent('objective.multiple.start');
pipeline.createEvent('objective.multiple.end');

var watches;

module.exports.watches = watches = {};

module.exports.updateWatchList = function(args, next) {
  var rootUuid = args.root.config.uuid;
  var config = args.config;
  var filename = config.filename; // to run on change
  var used = args.used;

  used.forEach(function(file) {
    if (watches[file] && watches[file][rootUuid] && watches[file][rootUuid][filename]) return;

    if (!watches[file]) {
      watches[file] = {};
      fs.watchFile(file, {interval: 200}, function(curr, prev) {
        if (!(prev.mtime < curr.mtime)) {
          return;
        }
        module.exports.runForWatched(watches[file]);
      })
    }

    watches[file][rootUuid] = watches[file][rootUuid] || {};
    watches[file][rootUuid][filename] = watches[file][rootUuid][filename] || {};
  });
  next();
}

module.exports.runForWatched = function(tree) {
  sequence(
    Object.keys(tree).map(function(rootUuid) {
      return function() {
        return new promise(function(resolve) {
          var root = roots[rootUuid];

          if (!root.config.runAll) {
            for(var filename in tree[rootUuid]) {
              root.files.test[filename].run = true;
            }
          }
          args = { // fake the necessary
            root: {
              config: {
                uuid: rootUuid
              }
            },
            path: root.config.testDir
          }
          module.exports.endRecurse(args, resolve);
        });
      }
    })
  ).then(function(){});
}



module.exports.foundFile = function(args, next) {
  var root = roots[args.root.config.uuid];
  var detail, files;

  if (!(detail = module.exports.getDetail(args))) {
    // not source or test file
    return next();
  }



  // ensure type [source or test] is present on root
  root.files[detail.type] = (root.files[detail.type] || detail)
  files = root.files[detail.type]
  // if (!files[detail.file]) args.watch = true; // first encounter
  //                                            // tell recursor to
  //                                           // 'watch' the file
  if (detail.type == 'source') {
    files[detail.file] = detail;
    TODO('compile source on recurse found file');
  } 
  else if (detail.type == 'test') {
    files[detail.file] = detail;
    detail.run = true;
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

  Object.keys(root.root.children).map(function(uuid) {
    root.root.children[uuid].tree.children.length = 0; // reset test trees
  });

  dev.runningMultiple = true;
  return pipeline.emit('objective.multiple.start',{
      root: root.root
    },
    function(err, res) {
      if (err) error(err);
      sequence((function(){
        var functionArray = [];
        for(var file in root.files.test) {
          (function(file){
            functionArray.push(function(){
              return promise(function(resolve, reject) {
                var detail = root.files.test[file];
                if (!detail.run && !root.config.runAll) return resolve()
                detail.run = false;
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
              root: root.root,
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
              root: root.root,
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
  var file = args.file;
  var detail;

  if (detail = root.files.test[file]) {
    if (dev.runStep) {
      // buzy, if in a wait in the same file, resolve and proceed
      if (dev.runStep.waiting) {
        if (dev.runStep.config.filename == file) {
          global[prepend + 'see'].done;
          return next();
        }
      }
    }
    if (!objective.currentChild) {
      // Changed file is a test, run it if no other child 
      // already running.
      if (root.config.runAll) {
        args.file = root.config.testDir;
        return module.exports.endRecurse(args, next);
      }
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
    testFile = testFile + sep + detail.base + root.config.testAppend;
    if (!objective.currentChild) {
      if (!module.exports.gotTest(args.root.home + sep + testFile)) {
        warn('Missing test file at %s', testFile);
        if (!root.config.runAll) return next();
      }
      if (root.config.runAll) {
        args.file = root.config.testDir;
        return module.exports.endRecurse(args, next);
      }
      return root.root.loadChild(testFile).then(
        function(result) {
          next();
        }, 
        next
      );
    }
    if(root.files.test[testFile]) {
      warn('Ignored %s, buzy.',testFile);
    }
    return next();
  }
  next();
}

module.exports.gotTest = function(basename) {
  var got = false;
  [basename + '.js', basename + '.coffee'].forEach(function(filename) {
    try {
      fs.lstatSync(filename);
      got = true;
    } catch (e) {}
  });
  return got;
}

module.exports.getDetail = function(args) {
  var root = roots[args.root.config.uuid];
  // console.log(roots);
  var config = root.config;
  var testDir = config.testDir;
  var testAppend = config.testAppend;
  var sourceDir = config.sourceDir;
  var file = args.file;
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
        file: file,
        run: false
      };
    if (base.match(new RegExp(testAppend+'$'))) {
      return {
        type: 'test',
        base: base,
        ext: ext,
        file: file,
        run: false
      }
    }
  } else if (file.match(new RegExp('^'+sourceDir + sep))) {
    return {
      type: 'source',
      base: base,
      ext: ext,
      file: file,
      run: false
    }
  }
  
  return false;
}
