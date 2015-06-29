// TODO: fix require sequencing problem
//       - require in module is not accessable to mock
//         unless the all are injected at same test tier

var expector = require('./expector')
  , warn = objective.logger.warn
  , debug = objective.logger.createDebug('dev:injector')
  , mock
  , dev = require('../')
  , dirname = require('path').dirname
  , extname = require('path').extname
  , basename = require('path').basename
  , normalize = require('path').normalize
  , sep = require('path').sep
  , fs = require('fs')
  , pipeline = objective.pipeline
  , dev = require('../')
  , ConfigurationError = require('../errors').ConfigurationError
  , InjectionError = require('../errors').InjectionError
  ;

module.exports.mocks = mocks = {};


pipeline.on('dev.test.before.each',

  module.exports.prune = function(args) {

  // Remove all mocks not created in ancestor test node

                                // is it really necessary to keep
                               // those that were created in ancestor,
                              // they will still be in scope,
                             // only if they inject again will things
                            // get complicated.

  for (var key in mocks) {
    var remove = true;
    var createdInId = mocks[key].created.step.node.id;
    var currentNode = args.test.node;
    var recurse = function(node) {
      if (node.id == createdInId) return remove = false;
      if (!node.parent) return;
      recurse(node.parent);
    };
    recurse(currentNode);
    if (remove) delete mocks[key];
  }
}, true);


pipeline.on('dev.test.after.each',

  module.exports.trim = function(args) {

  // Remove all mocks not created in beforeAll or 
  // ancestor context/describe.
  // This allows mocking of new object by same name
  // in beforeEach hooks

  for (var key in mocks) {
    
    if (mocks[key].created.step.type == 'beforeAll') continue;

    var remove = true;
    var createdInId = mocks[key].created.step.node.id;
    var currentNode = args.test.node;
    var recurse = function(node) {
      if (node.id == createdInId && node.type == 'context')
        return remove = false;
      if (!node.parent) return;
    };
    recurse(currentNode);
    if (remove) delete mocks[key];
  }
}, true);


pipeline.on('dev.test.after.all',

  module.exports.flush = function(args) {

  for (var key in mocks) delete mocks[key];

}, true);


module.exports.mock = function(name, object, requirePath) {

  debug('creating mock %s', name, object);

  if (typeof name === 'undefined') return;
  if (typeof name !== 'string') {
    object = name;
    if (object.$$mockid) return object;
    return expector.create(object);
  }
                           // others? on Object.prototype
                          // that will always be[defined]
                         // 
                        //
                       //
  if (mocks[name]) {  //
    if (name !== 'should') {
      if (mocks[name].object.$$mockid !== object.$$mockid) {
        throw new ConfigurationError('Cannot reassign mock name \''+name+'\' to new object.', {
          orignalAt: mocks[name].created.step.info,
          thisAt: dev.runStep.step.info
        });
      }
    }
    return object
  }
  if (typeof object === 'undefined') object = {};
  else if (typeof object === 'number' || typeof object === 'string') {
    throw new ConfigurationError('Cannot mock ' + typeof object, {
      thisAt: dev.runStep.step.info
    });
  }
  if (object.$$mockname && object.$$mockname !== name) {
    throw new ConfigurationError('Cannot reassign mocked object \''+object.$$mockname+'\' to new mock name \''+name+'\'',{
      orignalAt: mocks[object.$$mockname].created.step.info,
      thisAt: dev.runStep.step.info
    });
  } else {
    // console.log(require.cache[requirePath]);
    // if (require.cache[requirePath].exports.$$mockid) {

    // } else {
      Object.defineProperty(object, '$$mockname', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: name,
      });
    // }
  }

  mocks[name] = {
    object: expector.create(object),
    created: dev.runStep || dev.walkStep,
    requirePath: requirePath
    // dev.runStep  - For mocks created in tests or hooks
    // dev.walkStep - For mocks created in context and describe nodes
    //                via injection or liberal use of scope
  }

  return mocks[name].object
}

module.exports.load = function(root, config, argName) {

  if (mocks[argName]) return mocks[argName].object;

  var devconfig = dev.roots[root.config.uuid].config;
  var libDir = devconfig.compileTo || devconfig.sourceDir;
  var requirePath;
  var object;

  if (argName.match(/^[A-Z]/)) {

    // Starts with capital letter. Search libDir for corresponding mudule
    // eg.  when 'ModuleName' look for module_name, module-name, moduleName, ModuleName
    //      if multiple matches, same path relative to spec wins

    requirePath = module.exports.findLocalModule(root, config, devconfig, libDir, argName);
    if (!requirePath) {
      throw new InjectionError('Found no LocalModule match for \'' + argName + '\'')
    }
    try {
      object = require(requirePath);
      return module.exports.mock(argName, object, requirePath);
    } catch (e) {
      throw e;
    }
  }

  // everything else is assumed a node_module

  try {
    object = objective.require(argName).from({
      dirname: dirname(root.home + sep + config.filename),
      includeLocal: false, // includeLocal varname seems backwards from here
      getPath: function(path) {
        // console.log({path:path})
        requirePath = path;
      }
    })
    return module.exports.mock(argName, object, requirePath);
  } catch (e) {
    throw e;
  }
}


module.exports.findLocalModule = function(root, config, devconfig, libDir, argName) {
  var caps, parts, tries, matches, recurse, origin;
  caps = argName.match(/[A-Z]/g);
  parts = argName.split(/[A-Z]/);
  tries = ['', '', ''];
  parts.shift();
  for (var i = 0; i < caps.length; i++) {

    if (i !== 0) tries[0] += '_';
    tries[0] += caps[i].toLowerCase();
    tries[0] += parts[i].toLowerCase();

    if (i !== 0) tries[1] += '-';
    tries[1] += caps[i].toLowerCase();
    tries[1] += parts[i].toLowerCase();

    if (i === 0) tries[2] += caps[i].toLowerCase();
    if (i > 0) tries[2] += caps[i];
    tries[2] += parts[i].toLowerCase();
  }

  matches = [];

  if (tries[0] == tries[1] && tries[1] == tries[2]) tries.length = 1;
  tries.push(argName);

  try {
    tries.forEach(function(match) {
      recurse = function (directory) {
        var files = fs.readdirSync(directory);
        files.forEach(function(file) {
          var stat = fs.lstatSync(directory + sep + file);
          if (stat.isDirectory()) {
            if (file == match) {
              //directory exaclty matches, if it has index it's a possible match
              try {
                var dirlist = fs.readdirSync(directory + sep + file)
                dirlist.forEach(function(f) {
                  if (f.match(/^index\./)) matches.push(directory + sep + file + sep + f);
                });
              } catch (e) {}
            }
            recurse(directory + sep + file);
          } else {
            if (file.match(new RegExp('^'+match+'\.'))) matches.push(directory + sep + file);
          }
        });
      };
      recurse(root.home + sep + libDir);
    });
  } catch (e) {
    return null;
  }

  if (matches.length == 0) return null;
  if (matches.length == 1) return matches[0];
  if (matches.length > 1) {
    // return that one that matches path converted from testDir to libDir
    origin = dirname(config.filename);
    origin = origin.replace(new RegExp('^'+devconfig.testDir),libDir);
    origin = root.home + sep + origin;
    for (var i = 0; i < matches.length; i++) {
      if (dirname(matches[i]) == origin) return matches[i];
    }
  }
  return null;
}


