
{logger, pipe} = objective

{info, error, debug, TODO} = logger

TODO 'inject into pipe args'
TODO 'test timeouts error'

module.exports = ->

    debug 'using default test reporter'

    #
    # console.log pipe.pipes
    # 

    pipe.on 'dev.test.before.all', (payload, next) ->

        console.log()
        next()

    pipe.on 'dev.test.after.all', (payload, next) ->

        console.log()
        next()

    pipe.on 'dev.test.after.each', ({test}, next) ->

        if test.type == 'test'

            testName = test.node.path[1..].join ' - '

            unless test.error?

                console.log 'PASSED - ' + testName
                return next()

            console.log 'FAILED - ' + testName
            console.log test.error.stack
            return next()

        if test.error?

            testName = test.node.path[1..].join ' - '
            console.log "ERROR - in '#{test.type}' for '#{testName}'"
            console.log "FN - #{test.fn.toString()}"
            console.log "STACK - " + test.error.stack 

        next()