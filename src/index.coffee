{normalize, sep, extname, basename, dirname} = require 'path'

{TODO, error, warn} = objective.logger

debug = objective.logger.createDebug 'dev'

fs = require 'fs'

{promise} = require 'when'

sequence = require 'when/sequence'

shared = require './shared'

tester = require './tester'

reporters = require './reporters'

stacks = require './stacks'

process.on 'uncaughtException', (e) ->

    console.log "Exception captured out of test: #{e.toString()}"

module.exports = dev = shared.dev =

    $$name: 'dev'

    $$beforeEach: tester.$$beforeEach

    testDir: 'test'

    sourceDir: 'lib'

    # expectorName: 'does'

    walkDepth: 3

    walkWidth: 3

    compileTo: undefined

    reporter: 'default'

    showErrors: false

    reporters: require './reporters'

    matchTest: [ /_spec\.coffee$/, /_spec\.js$/ ]

    matchSource: [ /\.coffee$/, /\.js$/ ]

    nodeSource: null # path to your node clone -- git clone -b v0.10.28-release https://github.com/joyent/node.git
                     #                                         ---------------- yours instead...
                     # used by stacks, not required

    init: (callback) ->

        try

            reporters[dev.reporter].enable()

        catch

            TODO 'reporter require relative to where?'

            require dev.reporter


        {pipeline} = objective


        files = {}


        pipeline.on 'files.recurse.found', (data) ->

            if data.path.match new RegExp "^#{dev.testDir}"

                for match in dev.matchTest

                    if data.path.match match

                        files[data.path] = type: 'test'

                        debug "objective-dev matched test '#{data.path}'"

                        data.watch = true

            else if data.path.match new RegExp "^#{dev.sourceDir}"

                for match in dev.matchSource

                    if data.path.match match

                        files[data.path] = type: 'src'

                        debug "objective-dev matched source '#{data.path}'"

                        data.watch = true

        waiting = []

        pipeline.on 'files.recurse.end', ({path}, next) ->

            return next() unless path.match new RegExp "^#{dev.testDir}"

            objective.noRoot = true

            sequence( for file of files

                {type} = files[file]

                continue unless type == 'test'

                do (file) -> -> promise (resolve, reject) ->

                    debug('processing recurse queued objective', file);
                    try debug('already running', objective.currentChild.config.filename);

                    # return resolve() unless file == 'spec/something_hashey_spec.coffee'

                    try

                        require process.cwd() + sep + file

                        if objective.currentChild.config.filename == file

                            # each new objective started pushes the promise into 
                            # waiting, all exit cases handled in events below.

                            waiting.push resolve

                    catch e

                        error e.stack

                        resolve()

            ).then ->

                debug('done queued');

                pipeline.emit 'multiple.objectives.done', {}, ->

                    objective.noRoot = false

                    next()

        pipeline.on 'objective.empty', ->

            try waiting.pop()()
        
        pipeline.on 'objective.not.promised', ->

            try waiting.pop()()

        pipeline.on 'objective.init.error', ->

            try waiting.pop()()

        pipeline.on 'objective.run.error', ->

            try waiting.pop()()

        pipeline.on 'dev.test.after.all', ->

            try waiting.pop()()


        errors = 0

        pipeline.on 'files.recurse.changed', ({path}, next) ->

            runTest = (path) ->

                debug("running test at '#{path}'")

                if objective.currentChild?

                    warn "skipping '#{path}' while running '#{objective.currentChild.config.filename}'"

                    return next()

                delete require.cache[process.cwd() + sep + path]

                require process.cwd() + sep + path

                return next()


            runTest path if path.match new RegExp "^#{dev.testDir}"

            if path.match new RegExp "^#{dev.sourceDir}"

                if path.match /\.coffee$/

                    if dev.compileTo?

                        destination = path.replace new RegExp("^#{dev.sourceDir}"), dev.compileTo

                        destination = destination.replace /\.coffee$/, '.js'

                        debug('start compiling coffee from %s to %s', path, destination)

                        try

                            compiled = objective.coffee.compile fs.readFileSync(path).toString(), 
                                bare: true
                                filename: path

                            fs.writeFileSync destination, compiled

                            if errors > 0
                                error 'resolved'
                                errors = 0

                            debug('done compiling coffee from %s to %s', path, destination)

                            TODO 'multiple tests from uuids in sourcefile header'

                            testPath = path.replace new RegExp("^#{dev.sourceDir}"), dev.testDir

                            dir = dirname testPath

                            base = basename testPath, ext = extname testPath

                            testPath = dir + sep + base + '_spec'

                            files = fs.readdirSync dir

                            for file in files

                                mExt = extname file
                                mBase = basename file, mExt

                                if mBase == base + '_spec'

                                    if ['js', 'coffee'].indexOf mExt >= 0

                                        foundTest = dir + sep + mBase + mExt

                            if foundTest then return runTest foundTest

                            warn 'missing objective at ' + dir + sep + base + '_spec' + ext


                        catch e
                            error e.toString()
                            errors++
                            return next()
                        

                       

                return next()

            next()

        pipeline.on 'prompt.commands.register.ask', (command) ->

            command.create 'createModule',

                description: '(dev) Create new module in the current project.'

                run: require('./commands/create_module')

                help: """

                Usage: dev.createModule #{dev.testDir}/path/to/module_name [templateName]

                Creates the '#{dev.testDir}' file and the corresponding '#{dev.sourceDir}' file.

                    ie.

                        #{dev.testDir}/path/to/module_name.js
                        #{dev.sourceDir}/path/to/module_name.js

                The paths match up so that when the '#{dev.sourceDir}' file changes the
                corresponding '#{dev.testDir}' file can be found and run.

                It is recommended to use underscores between the name parts
                so that the module injector can be used in tests.

                    ie.  

                        module_name.js will be injectable as ModuleName
                        (provided that it is unique project-wide)

                If templateName is specified the corresponding template will be used.

                    ie.

                        ~/.objective/templates/dev/templateName_spec.js


                NOTE: The templates are only installed upon registration. (--register)

                """

                autoComplete: (args, callback) ->

                    return callback null, null if args.length > 2


                    if args.length == 1

                        return callback null,

                            type: 'path'

                            startIn: normalize dev.testDir + '/'

                            onlyDirectories: true



                    if args.length == 2

                        try
                        
                            directory = fs.readdirSync process.env.HOME + '/.objective/templates/dev'

                            matches = []

                            for file in directory

                                if file.match new RegExp "_spec.#{shared.language}"

                                    matches.push file.replace "_spec.#{shared.language}", ''

                            callback null, matches

                        catch

                            callback null, null

            command.create 'renameModule',

                description: '(dev) Deletes module from the current project.'

                run: (args, callback) ->

                    callback()


            command.create 'destroyModule',

                description: '(dev) Deletes module from the current project.'

                run: (args, callback) ->

                    callback()

            # command.create 'dev.killModule',

            #     description: 'Deletes module and performs git rm.'

            #     run: (args, callback) ->

            #         callback()

            command.create 'testModule',

                description: '(dev) Test a specific module.'

                run: (args, callback) ->

                    callback()

            command.create 'testAll',

                description: '(dev) Test all modules.'

                run: (args, callback) ->

                    callback()


        callback()

