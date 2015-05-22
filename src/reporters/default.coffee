
{logger, pipe} = objective

{info, error, debug, TODO} = logger

colors = require 'colors'

EOL = require('os').EOL

TODO 'Final stats after test (or test all)'
TODO 'runs initiated by file changes may overlap, fix (perhaps {noOvertake} pipe on change watcher'
TODO 'test timeouts error'
TODO 'reporter calls null tests pending - actually bdd does it'
TODO 'only walk from test onward, or ignore objective-dev'

fs = require 'fs'

firstfail = false

module.exports = ->

    debug 'using default test reporter'




    pipe.on 'dev.test.before.all', (payload, next) ->

        console.log()
        next()




    pipe.on 'dev.test.after.all', ({tree, functions}, next) ->

        for fn in functions

            return next() if fn.type != 'test' and fn.error?

            # no report if hook failed


        failed = 0
        passed = 0
        skipped = 0
        pending = 0

        recurse = (node, skipping = false) ->

            if node.type == 'it'

                pending++ if node.pending

                skipped++ if node.skip or skipping

                unless node.pending or node.skip or skipping

                    if node.error then failed++ else passed++

            if node.type == 'context'

                skipping = true if node.skip

            recurse child, skipping for child in node.children if node.children?

        recurse tree

        console.log "\nfail: #{failed} pass: #{passed} skip: #{skipped} pend: #{pending}"

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

                console.log() if firstfail

                firstfail = false

                TODO 'linkable stack on console.click to sublime plugin got location'

                console.log "ERROR".red, "in #{test.type}".bold
                
                walkStack test.error

            return next()

        unless test.error?

            process.stdout.write '*'.green

            # console.log 'PASSED '.green, testName

            firstfail = true

            return next()

        console.log() if firstfail

        firstfail = false

        console.log 'FAILED '.red + testName

        if test.error.name == 'AssertionError'

            showAssertionError test.error

            return next()

        else if test.error.name == 'ExpectationError'

            console.log test.error.stack.split(EOL)[0].bold.red

            try console.log JSON.stringify test.error.detail, null, 2

            return next()

        walkStack test.error

        return next()


showAssertionError = (error) ->

    TODO 'Assertion diff'
    console.log error.toString()

walkStack = (error) ->

    stack = error.stack.split EOL
    console.log stack[0].bold.red
    count = 0
    for line in stack[1..]
        if count < dev.walkDepth
            console.log line.bold
        else if count == dev.walkDepth
            console.log "\n#{line}"
        else console.log line
        try
            if line.match /\)$/ then [m, file, lineNo, colNo] = line.match /\((.*):(\d+)\:(\d+)\)/
            else [m, file, lineNo, colNo] = line.match /at\ (.*):(\d+)\:(\d+)$/
            showCode file, lineNo, colNo unless count >= dev.walkDepth
        count++


showCode = (file, line, col) ->

    lines = fs.readFileSync(file).toString().split EOL

    line = parseInt line

    for i in [0..lines.length - 1]

        continue unless i + dev.walkWidth > line
        continue unless i - dev.walkWidth < line 

        console.log lines[i].grey unless line == i + 1
        console.log lines[i].red if line == i + 1



