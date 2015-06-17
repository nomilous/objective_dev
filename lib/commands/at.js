var sep = require('path').sep;
var execFile = require('child_process').execFile;
module.exports = {
  description: '(dev,sublime) Paste line from stack trace to open.',
  help: ( 
      '\n'
    + '\n'
    + '\n'
    + 'Three clicks (osx) selects entire stack-trace line.\n'
    + '\n'
    + 'cmd^C cmd^V pastes it into this tools console.\n'
    + '\n'
    + 'The line starts with "at", so it runs this command.\n'
    + '\n'
    + 'You will need to have a user module exporting goto() or sublimePath\n'
    + '\n'
    + 'eg. (in /your/homedir/.objective/user.(js|coffee)\n'
    + '\n'
    + '    module.exports.sublimePath = "/bin/subl";\n'
    + '    or\n'
    + '    module.exports.goto = function(place) {/* all yours */}\n'
    + '\n'
    + 'It will open in existing sublime window, or create a new one.\n'
    + '\n'
    + 'If you have more than one window, it does not always do the\n'
    + 'smartest thing.\n'
    + '\n'
    + '\n'
  ),
  run: function(args, callback) {

    // (sublime, others?), plugin, goto

    var line = args.join(' ');
    var file = line.match(/\((.*):(.*):(.*)\)/);
    var place = {
      type: 'local.source.file',
      fileName: file[1],
      lineNumber: file[2],
      columnNumber: file[3]
    }
                                         // windows?
    var pathParts = place.fileName.split(sep)
    var i = parseInt(pathParts[0])
    if (typeof i == 'number') {
      pathParts[0] = objective.roots[i].home;
      place.fileName = pathParts.join(sep)
    }

    if (objective.user) {
      if (objective.user.goto) {
        // put your own in user.goto
        // consider sharing
        objective.user.goto(place);
      }
      else if (objective.user.sublimePath) {
        file = place.fileName + ':' + place.lineNumber + ':' + place.columnNumber;
        execFile(objective.user.sublimePath, [file], function() {
          // does it matter?
        })
      }
    }
    callback(null);
  }
}

// Would be really nice to solve the multiple sublime instance targeting problem
