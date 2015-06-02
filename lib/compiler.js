var compile = objective.coffee.compile
  , dirname = require('path').dirname
  , error = objective.logger.error
  , warn = objective.logger.warn
  , mkpath = require('mkpath')
  , sep = require('path').sep
  , fs = require('fs')
  ;

module.exports.compile = function(root, detail, options) {
  var compileTo = root.config.compileTo;
  if (!compileTo) return;
  var compileToDir = root.root.home + sep + compileTo;

  // ensure/create directory
  try {
    stat = fs.lstatSync(compileToDir);
    if (!stat.isDirectory()) {
      return warn('Cannot compile into not directory %s', compileToDir);
    }
  } catch (e) {
    if (e.code == 'ENOENT') {
      if (typeof options.createDir === 'undefined' || !options.createDir) {
        return warn('Refusing to create directory %s', compileToDir, 
          '\n         Use createDir:true on recursor.');
      } else {
        try {
          mkpath.sync(compileToDir);
          warn('created directory %s', compileToDir);
        } catch (e) {
          return error('In compile',e.stack);
        }
      }
    }
    else {
      return error('In compile',e.stack);
    }
  }

  if (detail.ext !== '.coffee') return; // md and litcoffee, jsx, ...

  var content;
  try {
    content = fs.readFileSync(root.root.home + sep + detail.file).toString()
  } catch (e) {
    return error('In compile (read file %s)',root.root.home + sep + detail.file , e.stack);
  }

  var outFileName, parts;
  try {
    parts = detail.file.split(sep);
    parts.shift();
    parts.unshift(compileTo);
    outFileName = root.root.home + sep + parts.join(sep)
    content = compile(content, {bare: true, filename:outFileName});
    outFileName = outFileName.replace(/\.coffee$/,'.js');
  } catch (e) {
    error(e);
    return;
  }

  
  try {

    mkpath.sync(dirname(outFileName)); // only refuse on creating root of src
    fs.writeFileSync(outFileName, content);
    warn('wrote file %s', outFileName.replace(process.cwd() + sep, ''));
  } catch (e) {
    return error('In compile (write file %s)', outFileName, e.stack);
  }

}
