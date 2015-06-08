var count, thingsIcreated;

thingsIcreated = {};

count = 1;

module.exports.create = function(opts) {
  var name;
  if (opts == null) {
    opts = {};
  }
  name = opts.name || 'untitled ' + count++;
  return thingsIcreated[name] = {
    "new": 'thing',
    name: name
  };
};
