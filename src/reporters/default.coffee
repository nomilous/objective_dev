
{logger, pipeline} = objective

{info, error, TODO} = logger

debug = logger.createDebug 'default:reporter'

colors = require 'colors'

EOL = require('os').EOL

TODO 'Final stats after test (or test all)'
TODO 'runs initiated by file changes may overlap, fix (perhaps {noOvertake} pipe on change watcher'
TODO 'test timeouts error'
TODO 'reporter calls null tests pending - actually bdd does it'
TODO 'only walk from test onward, or ignore objective-dev'

fs = require 'fs'

firstfail = false

initialised = false

enabled = undefined

accum = 

    pass: 0
    fail: 0
    skip: 0
    pend: 0
    test: 0
    hook: 0

module.exports.disable = ->

    enabled = false

module.exports.enable = ->

    enabled = true

    return if initialised

    initialised = true

    debug 'using default test reporter'

    pipeline.on 'multiple.objectives.done', (data) ->

        failed = accum.fail

        passed = accum.pass

        skipped = accum.skip

        pending = accum.pend

        totalTestDuration = accum.test

        totalHookDuration = accum.hook

        failedMsg = 'fail: 0  '
        passedMsg = 'pass: 0  '
        skipMsg = 'skip: 0  '
        pendMsg = 'pend: 0'

        if failed > 0 then failedMsg = "fail: #{failed}  ".red.bold

        if passed > 0 then passedMsg = "pass: #{passed}  ".green.bold

        if skipped > 0 then skipMsg = "skip: #{skipped}  ".cyan.bold

        if pending > 0 then pendMsg = "pend: #{pending}".yellow.bold

        console.log "\n  #{failedMsg} #{passedMsg} #{skipMsg} #{pendMsg}   test: #{totalTestDuration}ms   hook: #{totalHookDuration}ms"

        data.exitCode = failed


    pipeline.on 'dev.test.before.all', (payload) ->



    pipeline.on 'dev.test.after.all', ({stats}) ->

        return unless enabled

        failedMsg = 'fail: 0  '
        passedMsg = 'pass: 0  '
        skipMsg = 'skip: 0  '
        pendMsg = 'pend: 0'

        {failed, passed, skipped, pending, totalTestDuration, totalHookDuration} = stats

        if objective.noRoot

            # running multiple tests from command line

            accum.fail += failed
            accum.pass += passed
            accum.skip += skipped
            accum.pend += pending
            accum.test += totalTestDuration
            accum.hook += totalHookDuration

            return

        if failed > 0 then failedMsg = "fail: #{failed}  ".red.bold

        if passed > 0 then passedMsg = "pass: #{passed}  ".green.bold

        if skipped > 0 then skipMsg = "skip: #{skipped}  ".cyan.bold

        if pending > 0 then pendMsg = "pend: #{pending}".yellow.bold

        console.log "\n  #{failedMsg} #{passedMsg} #{skipMsg} #{pendMsg}   test: #{totalTestDuration}ms   hook: #{totalHookDuration}ms"





    pipeline.on 'dev.test.after.each', ({test}) ->

        return unless enabled

        try 

            testPath = test.node.path[0..]
            testPath[ testPath.length - 1 ] = testPath[ testPath.length - 1 ].bold
            testName = testPath.join ' + '

        test.duration = test.endedAt - test.startedAt

        unless test.type == 'test'

            # not test, must be hook
            # hooks that fail end the test run

            if test.error?

                console.log() if firstfail

                firstfail = false

                TODO 'linkable stack on console.click to sublime plugin got location'

                unless objective.plugins.dev.showError

                    console._stdout.write 'X'.red

                    return

                console.log ("ERROR".red.bold + " in #{test.type} - #{testName}")
                console.log "  (#{test.filename})"
                
                walkStack test.error

            return

        unless test.error?

            console._stdout.write '*'.green

            # console.log 'PASSED '.green, testName

            firstfail = true

            return

        if test.error?

            unless objective.plugins.dev.showError

                console._stdout.write '*'.red

                return

        console.log() if firstfail

        firstfail = false

        console.log 'FAILED '.red.bold + testName
        console.log "  (#{test.filename})"

        if test.error.name == 'AssertionError'

            showAssertionError test.error

            return

        else if test.error.name == 'ExpectationError'

            console.log "  " + test.error.stack.split(EOL)[0].bold.red

            try

                string = JSON.stringify test.error.detail, null, 3
                for line in string.split EOL
                    line = line.replace 'ERROR', 'ERROR'.bold.red
                    line = line.replace 'OK', 'OK'.bold.green
                    console.log "  " + line

            return

        walkStack test.error



showAssertionError = (error) ->

    TODO 'Assertion diff'
    console.log "  " + error.toString()

walkStack = (error) ->

    try
        stack = error.stack.split EOL
        console.log "  " + stack[0].bold.red
        count = 0
        for line in stack[1..]
            if count < objective.plugins.dev.walkDepth
                console.log line.bold
            else if count == objective.plugins.dev.walkDepth
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

        continue unless i + objective.plugins.dev.walkWidth > line
        continue unless i - objective.plugins.dev.walkWidth < line 

        console.log lines[i].grey unless line == i + 1
        console.log lines[i].red if line == i + 1



