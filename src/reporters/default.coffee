
{logger, pipe} = objective

{info, error, debug, TODO} = logger

colors = require 'colors'

EOL = require('os').EOL

TODO 'Final stats after test (or test all)'
TODO 'runs initiated by file changes may overlap, fix (perhaps {noOvertake} pipe on change watcher'
TODO 'test timeouts error'

fs = require 'fs'

showCode = (file, line, col) ->

    lines = fs.readFileSync(file).toString().split EOL

    line = parseInt line

    for i in [0..lines.length - 1]

        continue unless i + dev.walkWidth > line
        continue unless i - dev.walkWidth < line 

        console.log lines[i].grey unless line == i + 1
        console.log lines[i].red if line == i + 1



module.exports = ->

    debug 'using default test reporter'

    #
    # console.log pipe.pipes
    # 

    pipe.on 'dev.test.before.all', (payload, next) ->

        console.log()
        next()

    pipe.on 'dev.test.after.all', (payload, next) ->

        # console.log()
        next()

    pipe.on 'dev.test.after.each', ({test}, next) ->

        try 

            testPath = test.node.path[1..]
            testPath[ testPath.length - 1 ] = testPath[ testPath.length - 1 ].bold
            testName = testPath.join ' + '

        unless test.type == 'test'

            # not test, must be hook
            # hooks that fail end the test run

            if test.error?

                TODO 'linkable stack on console.click to sublime plugin got location'

                console.log "ERROR".red, "in #{test.type}".bold
                stack = test.error.stack.split EOL
                console.log stack[0].bold.red
                count = 0
                for line in stack[1..]
                    console.log line.bold
                    try
                        if line.match /\)$/ then [m, file, lineNo, colNo] = line.match /\((.*):(\d+)\:(\d+)\)/
                        else [m, file, lineNo, colNo] = line.match /at\ (.*):(\d+)\:(\d+)$/
                        showCode file, lineNo, colNo unless count >= dev.walkDepth
                    count++

            return next()

        unless test.error?

            process.stdout.write '*'.green

            # console.log 'PASSED '.green, testName
            return next()

        TODO 'behave according to error type, assert fails, error walsk stack'

        console.log 'FAILED '.red + testName
        stack = test.error.stack.split EOL
        stack[0] = stack[0].bold.red
        console.log stack.join EOL
        return next()

