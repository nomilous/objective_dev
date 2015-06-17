// TODO md docs rather

module.exports.register = function(command, next) {
  command.create('createModule', require('./create_module'));
  command.create('renameModule', require('./rename_module'));
  command.create('destroyModule', require('./destroy_module'));
  command.create('testModule', require('./test_module'));
  command.create('testAll', require('./test_all'));
  command.create('recurseAgain', require('./recurse_again'));
  command.create('coffee', require('./coffee'));
  command.create('at', require('./at'));
  next();
};
