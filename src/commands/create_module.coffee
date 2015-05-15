shared = require '../shared'

uuid = require 'uuid'

fs = require 'fs'

path = require 'path'

mkpath = require 'mkpath'


module.exports = CreateModule = (args, callback) ->


    tpath = args[0]

    lang = shared.language

    testDir = shared.dev.testDir

    sourceDir = shared.dev.sourceDir

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

    basename = path.basename(tpath).replace '_' + testDir + '.' + ext, ''


    if parts = basename.split /[-\._]/

        moduleName = ''

        for part in parts

            moduleName += part[0].toUpperCase() + part[1..]

    try

        stat = fs.lstatSync tpath

        if stat.isDirectory()

            return callback new Error 'Cannot create module at ' + tpath

        return callback new Error 'File already exists at ' + tpath


    console.log 'TODO: online creation'
    console.log 'TODO: warn on collision'
    
    # if shared.program.offline

    #     return callback new Error 'Cannot create when offline.'

    spath = tpath.replace new RegExp("^#{testDir}"), sourceDir
    spath = spath.replace new RegExp("_#{testDir}\."), '.'


    newObjective = 

        uuid: uuid.v4()
        title: moduleName
        description: ''
        private: shared.objective.private # inherit from parent objective

    template = args[1] || 'default'

    CreateModule.writeSpecFile tpath, template, lang, newObjective, (e) ->

        return callback e if e?

        CreateModule.writeSourceFile spath, moduleName, lang, newObjective, (e) ->

            callback e

        return




CreateModule.writeSpecFile = (out, template, lang, objective, callback) ->

    try

        templateFile = process.env.HOME + path.sep + ".objective/templates/dev/#{template}_spec.#{lang}"

        templateTxt = fs.readFileSync(templateFile).toString()
        templateTxt = templateTxt.replace /__UUID__/, objective.uuid
        templateTxt = templateTxt.replace /__TITLE__/, objective.title
        templateTxt = templateTxt.replace /__PRIVATE__/, objective.private
        
        try
            
            stat = fs.lstatSync out
            return callback new Error 'File already exists: ' + out

        mkpath.sync path.dirname out

        fs.writeFileSync out, templateTxt

        console.log "\n-----> Created file #{out}"

        callback()
        
    catch e

        if e.errno == 34

            return callback new Error "Missing template #{templateFile}(try --register)"
        
        callback e
    


CreateModule.writeSourceFile = (out, moduleName, lang, objective, callback) ->

    try
            
        stat = fs.lstatSync out
        return callback new Error 'File already exists: ' + out

    try

        mkpath.sync path.dirname out

        fs.writeFileSync out, "module.exports = #{moduleName} = {}\n"

        console.log "\n-----> Created file #{out}"

        callback()

    catch e

        callback e




