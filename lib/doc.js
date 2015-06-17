// TODO: maybe only do this just-in-time (at injection, per module)
// TODO: userize: different folk: different node version

var docs = {};
var fs = require('fs');
var marked = require('../deps/marked')
            .setOptions({gfm: true, terminal: true});

module.exports.docs = docs;

module.exports.attachDocPath = function(mod, modName) {
  var recurse = function(obj, path) {
    if (!(obj instanceof Object))
      if (!(obj instanceof Function)) 
        return;
    if (obj.$$docAt) return;
    Object.defineProperty(obj, '$$docAt', {
      enumerable: false,
      configurable: false,
      value: path.slice()
    })
    Object.keys(obj).forEach(function(key) {
      // dodge accessing deprecated
      if (path[0] == 'crypto') {
        if (key == 'createCredentials') return;
        if (key == 'Credentials') return;
      }
      path.push(key);
      recurse(obj[key], path);
      // TODO: also tag docAt on the prototypes
      path.pop();
    });
  }
  recurse(mod, [modName]);
}

module.exports.showDoc = function(thing) {

  // TODO: if $$doc == string, assume markdown and write as is
  // TODO: $$docAt as url + path part (cache)

  var path, filtered;
  if (!thing) return;
  if (!(path = thing.$$docAt)) return;

  if (path.length == 1) {
    console.log();
    console.log();
    return console.log(marked.parse(docs[path[0]]))
  } else if (path.length == 2) {
    var heading = null;
    filtered = docs[path[0]].split('\n').filter(function(line){
      if (line.trim().match(/^#/)) {
        var nextHeading = (line.trim().match(/(#*)\s/))[1]; // how many #'s
        if (heading) {
          if (nextHeading.length == heading.length) {
            heading = null;
          }
        }
        if (line.match(new RegExp(path[0]+'.'+path[1]))) {
          heading = nextHeading;
        }
      }
      // filter out while heading is undefined
      return heading !== null;
    });
    console.log();
    console.log();
    return console.log(marked.parse(filtered.join('\n')));
  }
}

try {
  fs.readdirSync(
    __dirname + '/../node_api_docs'
  ).filter(function(f) {
    return (
      f !== '_toc.markdown' && 
      f !== 'documentation.markdown' &&
      f !== 'synopsis.markdown' && 
      f !== 'addons.markdown' && 
      f !== 'debugger.markdown' && 
      f !== 'globals.markdown' && // another way
      f !== 'modules.markdown' && // another way
      f !== 'process.markdown' && // another way 
      f !== 'update'
    )
  }).forEach(function(f) {
    var modName = f.split('.')[0];
    try {
      var mod = require(modName);
      Object.defineProperty(docs, modName, {
        enumerable: true,
        get: function() {
          return fs.readFileSync(__dirname + '/../node_api_docs/' + f).toString();
        }
      })
      // docs[modName] = fs.readFileSync(__dirname + '/../node_api_docs/' + f).toString();
      module.exports.attachDocPath(mod, modName);
    } catch (e) {}
  });
} catch (e) {}

