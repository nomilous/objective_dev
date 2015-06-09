var prepend = process.env.OBJECTIVE_DEV_PREPEND || ''
  , tree // stores the test tree
  , breezes // that blow
  , can // i just have
  , one // more moon dance
  , pointer // current position in tree
  , defer = require('when').defer
  , debug = objective.logger.createDebug('dev:walker')
  , warn = objective.logger.warn
  , deferral
  , generate = require('shortid').generate
  , injector = require('./injector')
  , expector = require('./expector')
  , runner = require('./runner')
  , skipping
  , root
  , config
  , dev = require('../')
  , sep = require('path').sep
  , required // list of require.cache files present before starting
  ;

// that last test run's tree accessable at
// --attach  (objective.plugins.dev.tree)

Object.defineProperty(dev, 'tree', {
  enumerable:true,
  get: function() {
    return tree;
  }
});

// Access to the current test node being walked 
// during tree assembly.
// (In the same format as dev.runStep in the runner).
// Used for cleaning up mocks according to where
// they were created.

Object.defineProperty(dev, 'walkStep', {
  enumerable: true,
  get: function() {
    return {
      root: root,
      config: config,
      step: {
        into: pointer.info,
        type: pointer.type,
        node: pointer
      }
    }
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
  required = args.required;

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

global[prepend + 'mock'] = injector.mock;

global[prepend + 'wait'] = runner.wait;

global[prepend + 'see'] = {};

Object.defineProperty(global[prepend + 'mock'], 'original', {
  enumerable: false,
  configurable: false,
  get: function() {
    return expector.original();
  }
})

global[prepend + 'flush'] = function(skipWarn) {
  if (!dev.runStep) {
    var info = objective.getCaller(2, true);
    return warn('Cannot flush outside test or hook %s:%s:%s', info.file, info.line, info.col);
  }
  for (var filename in require.cache) {
    if (required[filename]) continue;
    if (!skipWarn) {
      var file = filename.replace(process.cwd() + sep, '');
      var cwd = file.length < filename.length ? 'cwd': '';
      warn('Flushing cached (%s) %s',cwd, filename.replace(process.cwd() + sep, ''));
    }
    delete require.cache[filename];
  }
  for (var name in injector.mocks) {
    var mock = injector.mocks[name];
    if (mock.created.step.type == 'beforeAll') {
      if (!skipWarn) {
        warn('Not flushing mock \'%s\' created in beforeAll',name);
      }
      continue;
    }
    if (!skipWarn) {
      warn('Flushing mock \'%s\'', name);
    }
    delete injector.mocks[name];
  }
}

global[prepend + 'describe'] = function(str, fn, skip, only) {
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
  // pointer.argNames = objective.argsOf(fn);
  // pointer.arguments = {};
  if (only) {
    pointer.only = true
    tree.only = true
  }
  doWithArgs = [];
  // pointer.argNames.forEach(function(arg) {
  objective.argsOf(fn).forEach(function(arg) {
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

global[prepend + 'describe'].only = function(str, fn, skip) {
  var skip = false;
  var only = true;
  global[prepend + 'describe'](str, fn, skip, only);
}

global[prepend + 'xdescribe'] = function(str, fn) {
  var skip = true;
  global[prepend + 'describe'](str, fn, skip);
}

global[prepend + 'context'] = global[prepend + 'describe'];
global[prepend + 'context'].only = global[prepend + 'describe'].only;
global[prepend + 'xcontext'] = global[prepend + 'xdescribe'];

global[prepend + 'it'] = function(str, fn) {
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

global[prepend + 'it'].only = function(str, fn) {
  if (typeof str !== 'string') return deferral.promise;
  var skip = skipping;
  var test = module.exports.createNode(pointer, 'it', str, skip, fn);
  test.only = true;
  pointer.children.push(test);
  tree.only = true;
  return deferral.promise;
}

global[prepend + 'xit'] = function(str, fn) {
  if (typeof str !== 'string') return deferral.promise;
  var skip = true;
  pointer.children.push(
    module.exports.createNode(pointer, 'it', str, skip, fn)
  );
  return deferral.promise;
}

global[prepend + 'xit'].only = function(str, fn) {
  var caller = objective.getCaller(2)
  require('colors');
  console._stdout.write('  error'.red + ' in ' + caller.file + ':' + caller.line + ':' + caller.col + '\n');
  console._stdout.write('  error'.red + ' Objective errored! ' + 'AppendixError: Unbibliographical lexical plume.\n'.red);
  console._stdout.write('  at /usr/include/lib/*.js:919:11\n');
  console._stdout.write('  at /var/captains/log/stardate/12532513241234514123453422134356436.js:1:1\n');
  console._stdout.write('  at /dev/impossible [occult stream]\n');
}

global[prepend + 'before'] = function(fn) {
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

global[prepend + 'beforeAll'] = function(fn) {
  if (typeof fn === 'function')
    pointer.hooks.beforeAll.push(
      module.exports.createHook('beforeAll', fn)
    );
  return deferral.promise;
}

global[prepend + 'beforeEach'] = function(fn) {
  if (typeof fn === 'function')
    pointer.hooks.beforeEach.push(
      module.exports.createHook('beforeEach', fn)
    );
  return deferral.promise;
}

global[prepend + 'after'] = function(fn) {
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

global[prepend + 'afterEach'] = function(fn) {
  if (typeof fn === 'function')
    pointer.hooks.afterEach.push(
      module.exports.createHook('afterEach', fn)
    );
  return deferral.promise;
}

global[prepend + 'afterAll'] = function(fn) {
  if (typeof fn === 'function')
    pointer.hooks.afterAll.push(
      module.exports.createHook('afterAll', fn)
    );
  return deferral.promise;
}

global[prepend + 'xbefore'] = function(fn) {
  return deferral.promise;
}

global[prepend + 'xbeforeAll'] = function(fn) {
  return deferral.promise;
}

global[prepend + 'xbeforeEach'] = function(fn) {
  return deferral.promise;
}

global[prepend + 'xafter'] = function(fn) {
  return deferral.promise;
}

global[prepend + 'xafterEach'] = function(fn) {
  return deferral.promise;
}

global[prepend + 'xafterAll'] = function(fn) {
  return deferral.promise;
}


