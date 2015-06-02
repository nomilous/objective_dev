var target = global
  , tree // stores the test tree
  , breezes // that blow
  , can // i just have
  , one // more moon dance
  , pointer // current position in tree
  , defer = require('when').defer
  , debug = objective.logger.createDebug('walker')
  , deferral
  , generate = require('shortid').generate
  , util = require('also').util
  , injector = require('./injector')
  , runner = require('./runner')
  , skipping
  , root
  , config
  ;

// - This thing walks the describe/context/it functions
//   and builds the test tree as it goes.
// - Each describe/context/it returns the test promise.
//   This means that the last describe/contenxt/it in 
//   the test file is what returns the promise to the
//   calling objective. For js, a specific return will 
//   need to be specified.

module.exports.reset = function(args) {
  // try {throw new Error()} catch(e) {console.log(e.stack)}
  // reset is called ahead of each spec file by

  for (key in tree) delete tree[key];

  root = args.root;
  config = args.config;

  var title = args.config.title;
  var type = 'root';
  var skip = false;
  
  tree = module.exports.createNode(null, type, title, skip, function(){0});
  pointer = tree;
  deferral = defer(); // the test promise
  tree.only = false;  // one of the tests calls .only()
  skipping = false;

  // There is no way to know when the tester
  // is finished walking and ready to run 
  // the accumulated tests. So relying on 
  // the objective caller to run start after
  // walk has exited the test entirely.

  deferral.promise.start = function() {
    runner.run(deferral, args, tree);
  }
}

module.exports.createNode = function(parent, type, str, skip, fn) {

  // Return a new test node.
  // Types 'root,context,it'

  debug('createNode', arguments);
  var pend, recurse, namePath;
  
  recurse = function(parent, parts) {
    parts.push(parent.str);
    if (!parent.parent) return parts;
    return recurse(parent.parent, parts);
  }

  namePath = parent ? recurse(parent, [str]) : [str];

  try {
    pend = (typeof fn === 'undefined') ? true : false;
    if (fn.toString() === 'function () {}') pend = true;
  } catch(e) {}

  return {
    id: generate(),
    hooks: {
      beforeAll: [],
      beforeEach: [],
      afterEach: [],
      afterAll: []
    },
    type: type,
    str: str,
    fn: fn,
    skip: skip,
    pend: pend,
    children: [],
    parent: parent,
    path: namePath,
    error: null
  }
}

target.mock = injector.mock;

target.describe = function(str, fn, skip, only) {
  var skip, prevPointer, prevSkipping, doWithArgs;
  if (typeof str !== 'string') return deferral.promise;
  if (typeof skip === 'undefined') skip = false
  if (typeof only === 'undefined') only = false
  // push new node into current pointer's children
  pointer.children.push(
    module.exports.createNode(pointer, 'context', str, skip, fn)
  );
  if (typeof fn !== 'function') {
    // no function, cant walk in.
    return deferral.promise;
  }
  // (push for walk), new pointer as child just made
  prevPointer = pointer;
  prevSkipping = skipping;
  skipping = skip;
  pointer = pointer.children[pointer.children.length - 1]
  // store the argument details of the test node
  // pointer.argNames = util.argsOf(fn);
  // pointer.arguments = {};
  if (only) {
    pointer.only = true
    tree.only = true
  }
  doWithArgs = [];
  // pointer.argNames.forEach(function(arg) {
  util.argsOf(fn).forEach(function(arg) {
    var value;
    doWithArgs.push(value = injector.load(root, config, arg));
    // pointer.arguments[arg] = value;
  });
  // walk into the describe function with injected args
  fn.apply(null, doWithArgs);
  // (pop from walk), reset pointer back
  skipping = prevSkipping;
  pointer = prevPointer;

  return deferral.promise;
}

target.describe.only = function(str, fn, skip) {
  var skip = false;
  var only = true;
  target.describe(str, fn, skip, only);
}

target.xdescribe = function(str, fn) {
  var skip = true;
  target.describe(str, fn, skip);
}

target.context = target.describe;
target.context.only = target.describe.only;
target.xcontext = target.xdescribe;

target.it = function(str, fn) {
  if (typeof str !== 'string') return deferral.promise;
  var skip = skipping;
  // its aren't run now, push into tree at
  // current position, tests after walk
  pointer.children.push(
    module.exports.createNode(pointer, 'it', str, skip, fn)
  );
  return deferral.promise;
}

target.it.only = function(str, fn) {
  if (typeof str !== 'string') return deferral.promise;
  var skip = skipping;
  var test = module.exports.createNode(pointer, 'it', str, skip, fn);
  test.only = true;
  pointer.children.push(test);
  tree.only = true;
  return deferral.promise;
}

target.xit = function(str, fn) {
  if (typeof str !== 'string') return deferral.promise;
  var skip = true;
  pointer.children.push(
    module.exports.createNode(pointer, 'it', str, skip, fn)
  );
  return deferral.promise;
}

target.xit.only = function(str, fn) {
  var detail = {};
  var caller = objective.getCallerFileName(2,detail)
  require('colors');
  console._stdout.write('  error'.red + ' in ' + caller + ':' + detail.lineNumber + ':' + detail.columnNumber + '\n');
  console._stdout.write('  error'.red + ' Objective errored! ' + 'AppendixError: Unbibliographical lexical plume.\n'.red);
  console._stdout.write('  at /usr/include/lib/*.js:919:11\n');
  console._stdout.write('  at /var/captains/log/stardate/12532513241234514123453422134356436.js:1:1\n');
  console._stdout.write('  at /dev/impossible [occult stream]\n');
}

target.before = function(fn) {
  if (typeof fn === 'object') {
    if (typeof fn.each === 'function') 
      pointer.hooks.beforeEach.push(fn.each);
    if (typeof fn.all === 'function') 
      pointer.hooks.beforeAll.push(fn.all);
  } else {8
    if (typeof fn === 'function')
      pointer.hooks.beforeAll.push(fn);
  }
  return deferral.promise;
}

target.beforeAll = function(fn) {
  if (typeof fn === 'function')
    pointer.hooks.beforeAll.push(fn);
  return deferral.promise;
}

target.beforeEach = function(fn) {
  if (typeof fn === 'function')
    pointer.hooks.beforeEach.push(fn);
  return deferral.promise;
}

target.after = function(fn) {
  if (typeof fn === 'object') {
    if (typeof fn.each === 'function') 
      pointer.hooks.afterEach.push(fn.each);
    if (typeof fn.all === 'function') 
      pointer.hooks.afterAll.push(fn.all);
  } else {
    if (typeof fn === 'function')
      pointer.hooks.afterAll.push(fn);
  }
  return deferral.promise;
}

target.afterEach = function(fn) {
  if (typeof fn === 'function')
    pointer.hooks.afterEach.push(fn);
  return deferral.promise;
}

target.afterAll = function(fn) {
  if (typeof fn === 'function')
    pointer.hooks.afterAll.push(fn);
  return deferral.promise;
}

target.xbefore = function(fn) {
  return deferral.promise;
}

target.xbeforeAll = function(fn) {
  return deferral.promise;
}

target.xbeforeEach = function(fn) {
  return deferral.promise;
}

target.xafter = function(fn) {
  return deferral.promise;
}

target.xafterEach = function(fn) {
  return deferral.promise;
}

target.xafterAll = function(fn) {
  return deferral.promise;
}


