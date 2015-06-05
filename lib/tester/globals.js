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
  , expector = require('./expector')
  , runner = require('./runner')
  , skipping
  , root
  , config
  , dev = require('../')
  , sep = require('path').sep
  ;

// that last test run's tree accessable at
// --attach  (objective.plugins.dev.tree)

Object.defineProperty(dev, 'tree', {
  enumerable:true,
  get: function() {
    return tree;
  }
});

// - This thing walks the describe/context/it functions
//   and builds the test tree as it goes.

module.exports.reset = function(args) {
  // try {throw new Error()} catch(e) {console.log(e.stack)}
  // reset is called ahead of each spec file run

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

  objective.strayPromise = deferral.promise;
}

module.exports.createInfo = function(depth, type) {
  var info = {};
  info = objective.getCaller(depth);
  info.type = type;
  // info.file = info.file.replace(process.cwd() + sep, '');
  return info;
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
    // some duplicate info here...
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
    info: module.exports.createInfo(4,type),
    parent: parent,
    path: namePath,
    error: null
  }
}

module.exports.createHook = function(type, fn) {
  return {
    id: generate(),
    type: type,
    fn: fn,
    info: module.exports.createInfo(4,type)
  }
}

target.mock = injector.mock;

target.wait = runner.wait;

target.see = {};

Object.defineProperty(target.mock, 'original', {
  enumerable: false,
  configurable: false,
  get: function() {
    return expector.original();
  }
})

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
  // module.exports.createInfo(3)
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
  var caller = objective.getCaller(2)
  require('colors');
  console._stdout.write('  error'.red + ' in ' + caller.file + ':' + caller.line + ':' + caller.col + '\n');
  console._stdout.write('  error'.red + ' Objective errored! ' + 'AppendixError: Unbibliographical lexical plume.\n'.red);
  console._stdout.write('  at /usr/include/lib/*.js:919:11\n');
  console._stdout.write('  at /var/captains/log/stardate/12532513241234514123453422134356436.js:1:1\n');
  console._stdout.write('  at /dev/impossible [occult stream]\n');
}

target.before = function(fn) {
  if (typeof fn === 'object') {
    if (typeof fn.each === 'function') 
      pointer.hooks.beforeEach.push(
        module.exports.createHook('beforeEach', fn.each)
      );
    if (typeof fn.all === 'function') 
      pointer.hooks.beforeAll.push(
        module.exports.createHook('beforeAll', fn.all)
      );
  } else {8
    if (typeof fn === 'function')
      pointer.hooks.beforeAll.push(
        module.exports.createHook('beforeAll', fn)
      );
  }
  return deferral.promise;
}

target.beforeAll = function(fn) {
  if (typeof fn === 'function')
    pointer.hooks.beforeAll.push(
      module.exports.createHook('beforeAll', fn)
    );
  return deferral.promise;
}

target.beforeEach = function(fn) {
  if (typeof fn === 'function')
    pointer.hooks.beforeEach.push(
      module.exports.createHook('beforeEach', fn)
    );
  return deferral.promise;
}

target.after = function(fn) {
  if (typeof fn === 'object') {
    if (typeof fn.each === 'function') 
      pointer.hooks.afterEach.push(
        module.exports.createHook('afterEach', fn.each)
      );
    if (typeof fn.all === 'function') 
      pointer.hooks.afterAll.push(
        module.exports.createHook('afterAll', fn.all)
      );
  } else {
    if (typeof fn === 'function')
      pointer.hooks.afterAll.push(
        module.exports.createHook('afterAll', fn)
      );
  }
  return deferral.promise;
}

target.afterEach = function(fn) {
  if (typeof fn === 'function')
    pointer.hooks.afterEach.push(
      module.exports.createHook('afterEach', fn)
    );
  return deferral.promise;
}

target.afterAll = function(fn) {
  if (typeof fn === 'function')
    pointer.hooks.afterAll.push(
      module.exports.createHook('afterAll', fn)
    );
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


