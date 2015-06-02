var expector = require('./expector')
  , warn = objective.logger.warn
  , mock
  , dev = require('../')
  , dirname = require('path').dirname
  , extname = require('path').extname
  , basename = require('path').basename
  , sep = require('path').sep
  , fs = require('fs')
  , pipeline = objective.pipeline
  ;

module.exports.mocks = mocks = {};

pipeline.on('dev.test.after.all', function(args, next) {
  // remove all mocks created by the just run test
  for (var key in mocks) delete mocks[key];
  next();
}, true);

module.exports.mock = function(name, object) {
  if (typeof name === 'undefined') return;
  if (typeof name !== 'string') {
    object = name;
    if (object.$$id) return object;
    return expector.create(object);
  }
  if (mocks[name] && mocks[name].object.$$id != object.$$id) {
    warn('Mock reassignment of \'%s\' ignored.', name);
    return
  }
  mocks[name] = {
    object: expector.create(object)
  }
  return mocks[name].object
}

module.exports.load = function(root, config, argName) {

  if (mocks[argName]) return mocks[argName].object;

  var devconfig = dev.roots[root.config.uuid].config;
  var libDir = devconfig.compileTo || devconfig.sourceDir;
  var requirePath;
  var object;

  if (argName == 'Subject' || argName == 'subject') {

    // Subject injects the corresponding module by filename

    requirePath = module.exports.specToSource(root, config, devconfig, libDir);

    try {
      object = require(requirePath);
      return module.exports.mock(object);
    } catch (e) {
      e.name = 'InjectionError';
      throw e
      // warn('Subject injection failed for \'%s\' in %s', requirePath.replace(process.cwd() + sep,''), config.filename, e)
    }
  }

  if (argName.match(/^[A-Z]/)) {

    // Starts with capital letter. Search libDir for corresponding mudule
    // eg.  when 'ModuleName' look for module_name, module-name, moduleName, ModuleName
    //      if multiple matches, same path relative to spec wins

    requirePath = module.exports.findLocalModule(root, config, devconfig, libDir, argName);
    if (!requirePath) {
      e = new Error('Found no LocalModule match for \'' + argName + '\'');
      e.name = 'InjectionError';
      throw e;
      // warn('Module injection failed for \'%s\' in %s', argName, config.filename);
    }
    try {
      object = require(requirePath);
      return module.exports.mock(object);
    } catch (e) {
      // e.name = 'InjectionError';
      throw e;
      // warn('Module injection failed for \'%s\' in %s', argName, config.filename, e);
      
    }

  }

  if (true) {

    // everything else is assumed a node_module

    try {
      object = require(argName);
      return module.exports.mock(object);
    } 
    catch (e) {
      // warn('Module injection failed for \'%s\' in %s', argName, config.filename, e)
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
          stat = fs.lstatSync(directory + sep + file);
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


