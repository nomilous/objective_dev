// TODO, nfo into describe and context
// TODO, empty function pends in js even with newlines
// TODO, hook opts / name
// TODO, test() for use in mocks to not throw
// TODO, now and again it sets all to pending and gets stuck there
//       last time was when i did this:   context 'name', it

var prepend = process.env.OBJECTIVE_DEV_PREPEND || ''
  , tree // stores the test tree
  , breezes // that blow
  , can // i just have
  , one // more moon dance
  , pointer // current position in tree
  , defer = require('when').defer
  , debug = objective.logger.createDebug('dev:walker')
  , warn = objective.logger.warn
  , deferral = {}
  , shortid = require('shortid')
  , injector = require('./injector')
  , expector = require('./expector')
  , runner = require('./runner')
  , pending
  , root
  , config
  , dev = require('../')
  , sep = require('path').sep
  , required // list of require.cache files present before starting
  , GlobalError = require('../errors').GlobalError
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
        info: pointer.info,
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

  // for (key in tree) delete tree[key];

  // Remember - tree is also stomped in handler runAll (onRecurse)
  //            for keepy-comparies later

  root = args.root;
  config = args.config;
  required = args.required;

  var title = args.config.title;
  var type = 'root';
  var skip = false;

  root.children[config.uuid].tree = module.exports.createNode(null, type, title, {}, skip, function(){0});
  tree = root.children[config.uuid].tree;
  pointer = tree;
  deferral = defer(); // the test promise
  objective.promised = deferral.promise;
  tree.only = dev.runOnly;
  skipping = false;

  // There is no way to know when the tester
  // is finished walking and ready to run 
  // the accumulated tests. So relying on 
  // the objective caller to run start after
  // walk has exited the test entirely.

  deferral.promise.start = function(err) {

    // injection error
    if (err) {
      tree.error = new GlobalError('', {
        error: err,
        treeId: tree.id
      });
    }

    // tree.only = dev.runOnly;
    if (dev.runOnly) {
      tree.children.forEach(function(child) {
        child.only = true;
      });
    }

    dev.pendAll = false;
    dev.runOnly = false;

    // If runAll is set the runner is called only after
    // walking all test files.
    //
    if (dev.roots[root.config.uuid].config.runAll) {
      return deferral.resolve();
    }
    return runner.run(deferral, args, tree);
  }

}

module.exports.createInfo = function(depth, type) {
  var info = objective.getCaller(depth);
  // if (info.file.match(new RegExp('dev'+sep+'lib'+sep+'tester'+sep+'index.js$'))) {
  //   console.log((new ObjectiveError().frames))
  // }
  info.type = type;
  // info.file = info.file.replace(process.cwd() + sep, '');
  return info;
}

module.exports.createNode = function(parent, type, str, nfo, pend, fn) {

  // Return a new test node.
  // Types 'root,context,it'

  debug('createNode', arguments);
  var recurse, namePath;
  
  recurse = function(parent, parts) {
    parts.push(parent.str);
    if (!parent.parent) return parts;
    return recurse(parent.parent, parts);
  }

  namePath = parent ? recurse(parent, [str]) : [str];

  namePath.reverse();

  if (!pend) {
    if (dev.pendAll) {
      pend = true;
    } else {
      try {
        pend = (typeof fn === 'undefined') ? true : false;
        if (fn.toString() === 'function () {}') pend = true;
      } catch(e) {}
    }
  }

  var node = {
    // some duplicate info here...
    id: shortid.generate(),
    hooks: {
      beforeAll: [],
      beforeEach: [],
      afterEach: [],
      afterAll: []
    },
    type: type,
    str: str,
    fn: fn,
    skip: false,
    pend: pend,
    children: [],
    info: module.exports.createInfo(3,type),
    parent: parent,
    path: namePath,
    error: null,
    cancelled: null,
    reported: false
  }
  return node;
}

module.exports.createHook = function(type, fn, str) {
  return {
    id: shortid.generate(),
    type: type,
    str: str,
    fn: fn,
    info: module.exports.createInfo(3,type)
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

global[prepend + 'flush'] = function() {
  skipWarn = true;
  if (!dev.runStep) {
    var info = objective.getCaller(1, true);
    return warn('Cannot flush outside test or hook %s:%s:%s', info.file, info.line, info.colm);
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

global[prepend + 'look'] = dev.look.showSource;

global[prepend + 'doc'] = dev.doc.showDoc;

module.exports.showTrace = function(arg1, arg2) {
  if (typeof arg1 === 'undefined') {
    arg1 = true;
    // console.log();
    // return dev.reporters.Reporter.prototype
    // .showStackTrace({root:root}, false, new Error(), '  ', 1);
    // using component of reporter is perhaps a bad idea?
    // it's for reporting test failures
  }
  if (typeof arg1 === 'function') {
    return dev.reporters.Reporter.prototype
    .showStackTrace({root:root}, false, new Error(), '  ', 1, arg1);
  } else if (typeof arg1 === 'number') {
    if (typeof arg2 === 'undefined') {
      console.log();
      return dev.reporters.Reporter.prototype
      .showStackTrace({root:root}, false, new Error(), '  ', 1,
        function(frame, line, i){
          if (i == arg1) {
            console.log(line);
          }
        }
      );
    }
    else if (typeof arg2 === 'function') {
      // getting a bit carried away here
      return dev.reporters.Reporter.prototype
      .showStackTrace({root:root}, false, new Error(), '  ', 1, 
        function(frame, line, i){
          if (i == arg1) {
            arg2(frame, line, i);
          }
        }
      );
    } 
  } else if (arg1 instanceof RegExp || typeof arg1 === 'boolean') {
    if (typeof arg2 === 'undefined') {
      console.log();
      return dev.reporters.Reporter.prototype
      .showStackTrace({root:root}, arg1, new Error(), '  ', 1,
        function(frame, line, i){
          console.log(line);
        }
      );
    }
    else if (typeof arg2 === 'function') {
      // getting a bit carried away here
      return dev.reporters.Reporter.prototype
      .showStackTrace({root:root}, arg1, new Error(), '  ', 1, 
        function(frame, line, i){
          arg2(frame, line, i);
        }
      );
    }
  };
}

module.exports.setFilterTrace = function(value) {
  if (typeof value === 'undefined') {
    return;
  }
  else if (typeof value === 'boolean' || value instanceof RegExp) {
    if (dev.runStep) {
      // running test or hook
      dev.runStep.step.node.filterTrace = value;
      return;
    }
    // walking context tree
    pointer.filterTrace = value;
  }
}

Object.defineProperty(module.exports.showTrace, 'filter', {
  enumerable: true,
  configurable: false,
  get: function() {
    return module.exports.setFilterTrace;
  },
  set: module.exports.setFilterTrace
});

Object.defineProperty(global, prepend + 'trace', {
  enumerable: false,
  configurable: true,
  get: function() {
    return module.exports.showTrace;
  },
  set: function(value) {
    if (typeof value == 'boolean') {
      if (value === true) {
        module.exports.setFilterTrace(false);
      } else {
        module.exports.setFilterTrace('no_trace');
      }
    }
  }
});


global[prepend + 'describe'] = function(str, nfo, fn, pend, only) {
  var prevPointer, prevPending, doWithArgs;
  if (typeof str !== 'string') return deferral.promise;
  if (typeof nfo === 'function') fn = nfo;
  if (typeof pend === 'undefined') pend = pending;
  if (typeof only === 'undefined') only = false;
  // push new node into current pointer's children
  pointer.children.push(
    module.exports.createNode(pointer, 'context', str, nfo, pend, fn)
  );
  if (typeof fn !== 'function') {
    // no function, cant walk in.
    return deferral.promise;
  }
  // (push for walk), new pointer as child just made
  prevPointer = pointer;
  prevPending = pending;
  pending = pend;
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
  pending = prevPending;
  pointer = prevPointer;

  return deferral.promise;
}

global[prepend + 'describe'].only = function(str, nfo, fn) {
  var pend = false;
  var only = true;
  return global[prepend + 'describe'](str, nfo, fn, pend, only);
}

global[prepend + 'xdescribe'] = function(str, nfo, fn) {
  var pend = true;
  return global[prepend + 'describe'](str, nfo, fn, pend);
}

global[prepend + 'context'] = global[prepend + 'describe'];
global[prepend + 'context'].only = global[prepend + 'describe'].only;
global[prepend + 'xcontext'] = global[prepend + 'xdescribe'];

global[prepend + 'it'] = function(str, nfo, fn) {
  // module.exports.createInfo(3)
  if (typeof str !== 'string') return deferral.promise;
  if (typeof nfo === 'function') {
    fn = nfo;
    nfo = {};
  }
  var pend = pending;
  // its aren't run now, push into tree at
  // current position, tests after walk
  pointer.children.push(
    module.exports.createNode(pointer, 'it', str, nfo, pend, fn)
  );
  return deferral.promise;
}

global[prepend + 'it'].only = function(str, nfo, fn) {
  if (typeof str !== 'string') return deferral.promise;
  if (typeof nfo === 'function') {
    fn = nfo;
    nfo = {};
  }
  var pend = pending;
  var test = module.exports.createNode(pointer, 'it', str, nfo, pend, fn);
  test.only = true;
  pointer.children.push(test);
  tree.only = true;
  return deferral.promise;
}

global[prepend + 'xit'] = function(str, nfo, fn) {
  if (typeof str !== 'string') return deferral.promise;
  if (typeof nfo === 'function') {
    fn = nfo;
    nfo = {};
  }
  var pend = true;
  pointer.children.push(
    module.exports.createNode(pointer, 'it', str, nfo, pend, fn)
  );

  return deferral.promise;
}

global[prepend + 'xit'].only = function(str, nfo, fn) {
  var caller = objective.getCaller(1)
  require('colors');
  console._stdout.write('  error'.red + ' in ' + caller.file + ':' + caller.line + ':' + caller.colm + '\n');
  console._stdout.write('  error'.red + ' Objective errored! ' + 'AppendixError: Unbibliographical lexical plume.\n'.red);
  console._stdout.write('  at /usr/include/lib/*.js:919:11\n');
  console._stdout.write('  at /var/captains/log/stardate/12532513241234514123453422134356436.js:1:1\n');
  console._stdout.write('  at /dev/impossible [occult stream]\n');
}

global[prepend + 'before'] = function(str, fn) {

  if (typeof str == 'function' || typeof str == 'object') {
    fn = str;
    str = undefined;
  }
  if (typeof fn === 'object') {
    if (typeof fn.each === 'function') 
      pointer.hooks.beforeEach.push(
        module.exports.createHook('beforeEach', fn.each, str)
      );
    if (typeof fn.all === 'function') 
      pointer.hooks.beforeAll.push(
        module.exports.createHook('beforeAll', fn.all, str)
      );
  } else {8
    if (typeof fn === 'function')
      pointer.hooks.beforeAll.push(
        module.exports.createHook('beforeAll', fn, str)
      );
  }
  return deferral.promise;
}

global[prepend + 'beforeAll'] = function(str, fn) {
  if (typeof str == 'function' || typeof str == 'object') {
    fn = str;
    str = undefined;
  }
  if (typeof fn === 'function')
    pointer.hooks.beforeAll.push(
      module.exports.createHook('beforeAll', fn, str)
    );
  return deferral.promise;
}

global[prepend + 'beforeEach'] = function(str, fn) {
  if (typeof str == 'function' || typeof str == 'object') {
    fn = str;
    str = undefined;
  }
  if (typeof fn === 'function')
    pointer.hooks.beforeEach.push(
      module.exports.createHook('beforeEach', fn, str)
    );
  return deferral.promise;
}

global[prepend + 'after'] = function(str, fn) {
  if (typeof str == 'function' || typeof str == 'object') {
    fn = str;
    str = undefined;
  }
  if (typeof fn === 'object') {
    if (typeof fn.each === 'function') 
      pointer.hooks.afterEach.push(
        module.exports.createHook('afterEach', fn.each, str)
      );
    if (typeof fn.all === 'function') 
      pointer.hooks.afterAll.push(
        module.exports.createHook('afterAll', fn.all, str)
      );
  } else {
    if (typeof fn === 'function')
      pointer.hooks.afterAll.push(
        module.exports.createHook('afterAll', fn, str)
      );
  }
  return deferral.promise;
}

global[prepend + 'afterEach'] = function(str, fn) {
  if (typeof str == 'function' || typeof str == 'object') {
    fn = str;
    str = undefined;
  }
  if (typeof fn === 'function')
    pointer.hooks.afterEach.push(
      module.exports.createHook('afterEach', fn, str)
    );
  return deferral.promise;
}

global[prepend + 'afterAll'] = function(str, fn) {
  if (typeof str == 'function' || typeof str == 'object') {
    fn = str;
    str = undefined;
  }
  if (typeof fn === 'function')
    pointer.hooks.afterAll.push(
      module.exports.createHook('afterAll', fn, str)
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


