shared = require '../shared'

uuid = require 'uuid'

fs = require 'fs'

path = require 'path'


module.exports = CreateModule = (args, callback) ->


    tpath = args[0]

    lang = shared.language

    testDir = shared.dev.testDir

    ext = tpath.split('.').pop()

    if ext == lang

        'allgood'

    else if ext == 'coffee' or ext == 'js'

        lang = ext

    else

        tpath += '.' + lang

    parts = tpath.split('.')

    ext = parts.pop()

    tpath = parts.join('.') + '_' + testDir + '.' + ext

    try

        stat = fs.lstatSync tpath

        if stat.isDirectory()

            return callback new Error 'Cannot create module at ' + tpath

        return callback new Error 'File already exists at ' + tpath


    console.log 'TODO: online creation'
    
    # if shared.program.offline

    #     return callback new Error 'Cannot create when offline.'



    newObjective = 

        uuid: uuid.v4()
        title: 'TTTT'
        description: ''
        private: shared.objective.private # inherit from parent objective

    CreateModule.writeSpecFile newObjective, (e) ->

        return callback e if e?

        CreateModule.writeSourceFile newObjective, (e) ->

            callback e

        return




CreateModule.writeSpecFile = (objective, callback) ->

    callback()


CreateModule.writeSourceFile = (objective, callback) ->

    callback()