thingsIcreated = {}

count = 1

module.exports.create = (opts = {}) ->

    name = opts.name || 'untitled ' + count++;

    thingsIcreated[name] = new: 'thing', name: name
