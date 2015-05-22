


# 
# subject
# Subject
# 

path = require 'path'

fs = require 'fs'

config = undefined

expector = require './expector'

module.exports.mocks = {}


module.exports.before = (conf) ->

    config = conf


module.exports.register = (name, object) ->

    try 

        test = dev.running.test
        type = test.type
        node = test.node

    unless module.exports.mocks[name]?

        return module.exports.mocks[name] =

            object: object
            createdIn: type
            createdAt: node

    fail = (msg) ->

        e = new Error msg
        e.name = 'InjectionError'
        throw e

    return fail("Cannot overwrite existing alias '#{name}'") unless test? && type? && node?

    createdIn = module.exports.mocks[name].createdIn
    createdAt = module.exports.mocks[name].createdAt

    if createdAt.id == node.id

        return fail "Cannot overwrite alias '#{name}' created in Sibling test node."


    recurse = (parent) ->

        if createdAt.id == parent.id

            return fail "Cannot overwrite alias '#{name}' created in Ancestor test node."

        recurse parent.parent if parent.parent?

    recurse node.parent if node.parent?

    module.exports.mocks[name] =

        object: object
        createdIn: type
        createdAt: node


module.exports.load = (name) ->

    if module.exports.mocks[name]? then return module.exports.mocks[name].object

    if name == 'Subject' or name == 'subject'

        modpath = config.filename.replace new RegExp("^#{dev.testDir}"), dev.sourceDir
        modpath = modpath.replace '_spec.', '.'

        try
            return expector.create require process.cwd() + path.sep + modpath

        catch e

            console.log "Subject injection failed. #{e.toString()}"
            return {}

    if name.match /^[A-Z]/

        caps = name.match /[A-Z]/g
        parts = name.split /[A-Z]/
        parts.shift()
        tries = ['','','']

        for i in [0..caps.length - 1]

            tries[0] += '_' unless i == 0
            tries[0] += caps[i].toLowerCase()
            tries[0] += parts[i].toLowerCase()

            tries[1] += '-' unless i == 0
            tries[1] += caps[i].toLowerCase()
            tries[1] += parts[i].toLowerCase()

            tries[2] += caps[i].toLowerCase() if i == 0
            tries[2] += caps[i] if i > 0
            tries[2] += parts[i].toLowerCase()

        tries.length = 1 if tries[0] == tries[1] == tries[2]

        matches = []

        for possible in tries

            recurse = (directory) ->

                files = fs.readdirSync directory

                for file in files

                    stat = fs.lstatSync directory + path.sep + file

                    unless stat.isDirectory()

                        if file.match new RegExp "^#{possible}."

                            matches.push directory + path.sep + file

                        continue

                    recurse directory + path.sep + file
            
            recurse process.cwd() + path.sep + dev.sourceDir

        if matches.length == 1

            return expector.create require matches[0]

        if matches.length == 0

            e = new Error "No injection match for '#{name}'"
            e.matches = matches
            throw e

        if matches.length > 1

            e = new Error "Multiple injection matches for '#{name}'"
            e.matches = matches
            throw e

    return expector.create require name



