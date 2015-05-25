module.exports.bdd = bdd = require './bdd'

module.exports.tdd = tdd = require './tdd'

module.exports.injector = injector = require './injector'

module.exports.expector = expector = require './expector'

module.exports.$$beforeEach = (config, callback) ->

    try

        tdd.$$beforeEach config
        bdd.$$beforeEach config
        injector.$$beforeEach config
        expector.$$beforeEach config

        callback()

    catch e

        callback e

