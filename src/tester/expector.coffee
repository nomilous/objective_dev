shortid = require 'shortid'

config = undefined

module.exports.before = (conf) ->

    config = conf

module.exports.create = (object) ->

    try Object.defineProperty object, '$$id', value: shortid.generate(), writable: false

    object.does = (spec) ->

        console.log does: spec

    return object
