module.exports.bdd = bdd = require './bdd'

module.exports.tdd = tdd = require './tdd'

module.exports.injector = injector = require './injector'

module.exports.expector = expector = require './expector'

module.exports.before = (config) ->

    tdd.before config
    bdd.before config
    injector.before config
    expector.before config
