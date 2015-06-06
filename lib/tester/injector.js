var expector = require('./expector')
  , warn = objective.logger.warn
  , debug = objective.logger.createDebug('dev:injector')
  , mock
  , dev = require('../')
  , dirname = require('path').dirname
  , extname = require('path').extname
  , basename = require('path').basename
  , sep = require('path').sep
  , fs = require('fs')
  , pipeline = objective.pipeline
  , dev = require('../')
  ;

module.exports.mocks = mocks = {};


pipeline.on('dev.test.before.each',

  module.exports.prune = function(args) {

  // Remove all mocks not created in ancestor test node

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


module.exports.mock = function(name, object) {

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
        // caller = objective.getCaller(2);
        // caller.file = caller.file.replace(process.cwd() + sep, '');
        var e = new Error('Cannot reassign mock name \''+name+'\' to new object.');
        e.orignalAt = mocks[name].created.step.info
        e.thisAt = dev.runStep.step.info
        e.name = 'ConfigurationError';
        throw e;
      }
    }
    return object
  }
  if (typeof object === 'undefined') object = {};
  else if (typeof object === 'number' || typeof object === 'string') {
    var e = new Error('Cannot mock ' + typeof object);
    e.name = 'ConfigurationError';
    e.thisAt = dev.runStep.step.info
    throw e;
  }
  if (object.$$mockname && object.$$mockname !== name) {
    var e = new Error('Cannot reassign mocked object \''+object.$$mockname+'\' to new mock name \''+name+'\'');
    e.name = 'ConfigurationError';
    e.orignalAt = mocks[object.$$mockname].created.step.info
    e.thisAt = dev.runStep.step.info
    throw e;
  } else {
    Object.defineProperty(object, '$$mockname', {
      enumerable: false,
      configurable: false,
      writable: false,
      value: name
    });
  }

  mocks[name] = {
    object: expector.create(object),
    created: dev.runStep || dev.walkStep
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
      e = new Error('Found no LocalModule match for \'' + argName + '\'');
      e.name = 'InjectionError';
      warn('Module injection failed for \'%s\' in %s', argName, config.filename);
      throw e;
    }
    try {
      object = require(requirePath);
      return module.exports.mock(argName, object);
    } catch (e) {
      // e.name = 'InjectionError';
      warn('Module injection failed for \'%s\' in %s', argName, config.filename, e);
      throw e;
    }
  }

  if (true) {

    // everything else is assumed a node_module

    try {
      object = require(argName);
      return module.exports.mock(argName, object);
    } 
    catch (e) {
      if (e.code == 'MODULE_NOT_FOUND') {
        e.name = 'InjectionError';
        e.message += ' for injection';
      }
      warn('Module injection failed for \'%s\' in %s', argName, config.filename, e)
      throw e;
    }
  }
}


module.exports.specToSource = function(root, config, devconfig, libDir) {
  var requirePath = dirname(config.filename);
  requirePath = requirePath.replace(new RegExp('^'+devconfig.testDir),libDir);
  base = basename(config.filename,extname(config.filename));
  base = base.replace(new RegExp(devconfig.testAppend+'$'),'');
  requirePath = root.home + sep + requirePath + sep + base;
  return requirePath;
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


