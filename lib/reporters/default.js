// Generated by CoffeeScript 1.9.2
var EOL, TODO, colors, debug, error, firstfail, fs, info, logger, pipe, showAssertionError, showCode, walkStack;

logger = objective.logger, pipe = objective.pipe;

info = logger.info, error = logger.error, debug = logger.debug, TODO = logger.TODO;

colors = require('colors');

EOL = require('os').EOL;

TODO('Final stats after test (or test all)');

TODO('runs initiated by file changes may overlap, fix (perhaps {noOvertake} pipe on change watcher');

TODO('test timeouts error');

fs = require('fs');

firstfail = false;

module.exports = function() {
  debug('using default test reporter');
  pipe.on('dev.test.before.all', function(payload, next) {
    console.log();
    return next();
  });
  pipe.on('dev.test.after.all', function(arg, next) {
    var failed, fn, functions, j, len, passed, pending, recurse, skipped, tree;
    tree = arg.tree, functions = arg.functions;
    for (j = 0, len = functions.length; j < len; j++) {
      fn = functions[j];
      if (fn.type !== 'test' && (fn.error != null)) {
        return next();
      }
    }
    failed = 0;
    passed = 0;
    skipped = 0;
    pending = 0;
    recurse = function(node, skipping) {
      var child, k, len1, ref, results;
      if (skipping == null) {
        skipping = false;
      }
      if (node.type === 'it') {
        if (node.pending) {
          pending++;
        }
        if (node.skip || skipping) {
          skipped++;
        }
        if (!(node.pending || node.skip || skipping)) {
          if (node.error) {
            failed++;
          } else {
            passed++;
          }
        }
      }
      if (node.type === 'context') {
        if (node.skip) {
          skipping = true;
        }
      }
      if (node.children != null) {
        ref = node.children;
        results = [];
        for (k = 0, len1 = ref.length; k < len1; k++) {
          child = ref[k];
          results.push(recurse(child, skipping));
        }
        return results;
      }
    };
    recurse(tree);
    console.log("\nfail: " + failed + " pass: " + passed + " skip: " + skipped + " pend: " + pending);
    return next();
  });
  return pipe.on('dev.test.after.each', function(arg, next) {
    var test, testName, testPath;
    test = arg.test;
    try {
      testPath = test.node.path.slice(1);
      testPath[testPath.length - 1] = testPath[testPath.length - 1].bold;
      testName = testPath.join(' + ');
    } catch (_error) {}
    if (test.type !== 'test') {
      if (test.error != null) {
        if (firstfail) {
          console.log();
        }
        firstfail = false;
        TODO('linkable stack on console.click to sublime plugin got location');
        console.log("ERROR".red, ("in " + test.type).bold);
        walkStack(test.error);
      }
      return next();
    }
    if (test.error == null) {
      process.stdout.write('*'.green);
      firstfail = true;
      return next();
    }
    if (firstfail) {
      console.log();
    }
    firstfail = false;
    console.log('FAILED '.red + testName);
    if (test.error.name === 'AssertionError') {
      showAssertionError(test.error);
      return next();
    } else if (test.error.name === 'ExpectationError') {
      console.log(test.error.stack.split(EOL)[0].bold.red);
      try {
        console.log(JSON.stringify(test.error.detail, null, 2));
      } catch (_error) {}
      return next();
    }
    walkStack(test.error);
    return next();
  });
};

showAssertionError = function(error) {
  TODO('Assertion diff');
  return console.log(error.toString());
};

walkStack = function(error) {
  var colNo, count, file, j, len, line, lineNo, m, ref, ref1, ref2, results, stack;
  stack = error.stack.split(EOL);
  console.log(stack[0].bold.red);
  count = 0;
  ref = stack.slice(1);
  results = [];
  for (j = 0, len = ref.length; j < len; j++) {
    line = ref[j];
    if (count < dev.walkDepth) {
      console.log(line.bold);
    } else if (count === dev.walkDepth) {
      console.log("\n" + line);
    } else {
      console.log(line);
    }
    try {
      if (line.match(/\)$/)) {
        ref1 = line.match(/\((.*):(\d+)\:(\d+)\)/), m = ref1[0], file = ref1[1], lineNo = ref1[2], colNo = ref1[3];
      } else {
        ref2 = line.match(/at\ (.*):(\d+)\:(\d+)$/), m = ref2[0], file = ref2[1], lineNo = ref2[2], colNo = ref2[3];
      }
      if (!(count >= dev.walkDepth)) {
        showCode(file, lineNo, colNo);
      }
    } catch (_error) {}
    results.push(count++);
  }
  return results;
};

showCode = function(file, line, col) {
  var i, j, lines, ref, results;
  lines = fs.readFileSync(file).toString().split(EOL);
  line = parseInt(line);
  results = [];
  for (i = j = 0, ref = lines.length - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
    if (!(i + dev.walkWidth > line)) {
      continue;
    }
    if (!(i - dev.walkWidth < line)) {
      continue;
    }
    if (line !== i + 1) {
      console.log(lines[i].grey);
    }
    if (line === i + 1) {
      results.push(console.log(lines[i].red));
    } else {
      results.push(void 0);
    }
  }
  return results;
};