uuid = require 'uuid'

fs = require 'fs'

path = require 'path'

mkpath = require 'mkpath'

module.exports = CreateModule = (args, callback) ->

    tpath = args[0]

    lang = 'coffee'

    testDir = dev.testDir

    sourceDir = dev.sourceDir

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

    
    # if shared.program.offline

    #     return callback new Error 'Cannot create when offline.'

    spath = tpath.replace new RegExp("^#{testDir}"), sourceDir
    spath = spath.replace new RegExp("_#{testDir}\."), '.'

    # console.log objective.root

    newObjective = 

        uuid: uuid.v4()
        title: moduleName
        description: ''
        private: objective.root.private # inherit from parent objective

    template = args[1] || 'default'

    # watch new files src and spec

    watch = (file) ->

        fs.watchFile file, interval: 100, (curr, prev) ->

            return unless prev.mtime < curr.mtime

            objective.pipe.emit 'files.watch.reload?', file, (err) ->

                return if err?

                try

                    filename = process.cwd() + '/' + file
                    delete require.cache[filename]
                    require filename

                catch e

                    console.log "\nError loading '#{filename}'"
                    console.log e.stack


    CreateModule.writeSpecFile tpath, template, lang, newObjective, (e) ->

        return callback e if e?

        watch tpath


        CreateModule.writeSourceFile spath, moduleName, lang, newObjective, (e) ->

            watch spath unless e?

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




