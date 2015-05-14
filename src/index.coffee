{normalize} = require 'path'

module.exports = dev = 

    testDir: 'test'

    sourceDir: 'lib'

    compileTo: undefined

    init: ({pipe, prompt}, callback) ->

        pipe.on 'prompt.commands.register.ask', (command, next) ->

            command.create 'dev.createModule',

                description: 'Create new module in the current project.'

                run: (args, callback) ->
                    
                    callback()

                help: """

                Usage: dev.createModule #{dev.testDir}/path/to/module_name

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

                """

                autoComplete:

                    type: 'path'

                    startIn: normalize dev.testDir + '/'

                    ignoreFiles: true


            command.create 'dev.destroyModule',

                description: 'Deletes module from the current project.'

                run: (args, callback) ->

                    callback()

            command.create 'dev.killModule',

                description: 'Deletes module and performs git rm.'

                run: (args, callback) ->

                    callback()

            command.create 'dev.testModule',

                description: 'Test a specific module.'

                run: (args, callback) ->

                    callback()

            command.create 'dev.testAll',

                description: 'Test all modules.'

                run: (args, callback) ->

                    callback()

            next()


        pipe.on 'files.recurse.start', ({path}, next) ->

            # console.log start: path

            next()

        pipe.on 'files.recurse.entering', ({path}, next) ->

            # console.log entering: path

            next()

        pipe.on 'files.recurse.found', ({path}, next) ->

            # console.log found: path

            next()

        pipe.on 'files.recurse.end', (data, next) ->

            # console.log end: data

            next()

        pipe.on 'files.recurse.error', (error, next) ->

            # console.log error: error

            next()


        callback()

