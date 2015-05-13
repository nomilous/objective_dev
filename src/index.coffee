module.exports = 

    init: ({pipe, prompt}, callback) ->

        pipe.on 'recurse.start', ({path}, next) ->

            # console.log start: path

            next()

        pipe.on 'recurse.entering', ({path}, next) ->

            # console.log entering: path

            next()

        pipe.on 'recurse.found', ({path}, next) ->

            # console.log found: path

            next()

        pipe.on 'recurse.end', (data, next) ->

            # console.log end: data

            next()

        pipe.on 'recurse.error', (error, next) ->

            # console.log error: error

            next()

        callback()
