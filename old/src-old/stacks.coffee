
# originalShowError = undefined

enabled = false

origPrepareStackTrace = undefined

module.exports.enable = ->

    dev = require '../'

    origPrepareStackTrace = Error.prepareStackTrace

    Error.prepareStackTrace = (_, stack) -> stack

    got = false

    for id of objective.repls

        got = true if objective.repls[id].grabbed

    unless got

        # no repl has the stream, send it nowhere 
        # so that stacks console is not interrupted
        # by background text

        devnull = require 'dev-null'
        console._stdout = devnull()
        console._stderr = devnull()
        objective.logger.setStream devnull()

    # or use 'grab' in attached repl 


    enabled = true

module.exports.disable = ->

    Error.prepareStackTrace = origPrepareStackTrace

    enabled = false


blessed = require 'blessed'

require 'colors'

screen = undefined

content = ''

text = undefined

fails = undefined

testPosition = 0

stepPosition = 0

pad = require 'pad'

fs = require 'fs'

{dirname, normalize, sep} = require 'path'

{EOL} = require 'os'

stack = []

successCount = 0

filename = undefined

linenumber = undefined

columnnumber = undefined

currentTest = ->

    num = fails.length - 1 - testPosition

    fail = fails[fails.length - 1 - testPosition]

    type = if fail.type == 'test' then '' else "(#{fail.type}) "

    path = fail.node.path

    pathLength = path.length

    "#{pad(2, (num + 1).toString(), '0')}".bold + " FAILED ".red.bold + "#{type.bold}" + path.join(' + ').bold

previousTest = ->

    num = fails.length - 2 - testPosition

    fail = fails[fails.length - 2 - testPosition]

    return '' unless fail?

    type = if fail.type == 'test' then '' else "(#{fail.type}) "

    path = fail.node.path

    ("#{pad(2, (num + 1).toString(), '0')}".bold + " FAILED " + "#{type.bold}" + path.join ' + ').grey

nextTest = ->

    num = fails.length - testPosition

    fail = fails[fails.length - testPosition]

    return '' unless fail?

    type = if fail.type == 'test' then '' else "(#{fail.type}) "

    path = fail.node.path

    ("#{pad(2, (num + 1).toString(), '0')}".bold + " FAILED " + "#{type.bold}" + path.join ' + ').grey


currentLine = -> 
    
    num = stepPosition

    data = stack[num]

    filename = data.getFileName()

    linenumber = parseInt data.getLineNumber()

    columnnumber = parseInt data.getColumnNumber()

    if filename? and linenumber?

        try

            result = EOL

            d = dirname filename

            if d == '.' and objective.plugins.dev.nodeSource?

                if filename == 'node.js'

                    filename = normalize objective.plugins.dev.nodeSource + sep + 'src' + sep + filename

                else

                    filename = normalize objective.plugins.dev.nodeSource + sep + 'lib' + sep + filename
        
            file = fs.readFileSync filename

            if filename.match /\.coffee/

                lines = objective.coffee.compile(file.toString(), bare: true).split EOL

                lines.unshift ''

            else

                lines = file.toString().split EOL

            for i in [0..lines.length - 1]

                continue unless i + 7 > linenumber
                continue unless i - 7 < linenumber

                result += lines[i].grey + EOL unless linenumber == i + 1
                result += lines[i].bold + EOL if linenumber == i + 1


    return """
    #{ pad(2, (num + 1).toString(), '0').bold} - #{data.toString()}
    #{result}
    """

previousLine = ->

    num = stepPosition - 1

    data = stack[num] || ''

    "#{pad(2, (num + 1).toString(), '0')}".bold + " - " + data.toString().grey

nextLines = ->

    lines = ""

    for i in [1..5]

        num = stepPosition + i

        data = stack[num]

        continue unless data?

        lines += "#{pad(2, (num + 1).toString(), '0')}".bold + " - " + data.toString().grey + '\n'

    remaining = stack.length - num - 1
    if remaining > 0
    
        lines += "\n + #{stack.length - num - 1} more".bold

    lines

stackReport = ->

    # #{previousLine()}

    """
    #{currentLine()}

    #{nextLines()}
    """


render = (browsing = false) ->

    # currentTest()

    return unless screen?

    count = fails.length

    if count == 0

        successCount++
        content += successCount.toString()
        text.setContent content
        screen.render()
        return

    successCount = 0

    content += '|' unless browsing

    beforeCount = count - testPosition - 1

    afterCount = testPosition

    fail = fails[fails.length - 1 - testPosition]

    filename = fail.filename

    try stack = fail.error.stack
    stack ||= []

    heading1 = "failed tests (#{count})".bold + "  up,down"

    try heading2 = fail.error.toString().red.bold

    heading2 ||= ""

    heading3 = "error stack (depth #{stack.length})" + "  left,right"

    failsText = """
    #{filename}
    #{heading1}

    #{previousTest()}
    #{currentTest()}
    #{nextTest()}
    
    #{heading2}
    #{heading3}

    #{stackReport()}

    """

    text.setContent failsText
    screen.render()


{pipeline} = objective

pipeline.on 'prompt.commands.register.ask', (command) ->

    close = undefined

    bell = ->  # process.stdout.write '\u0007'

    command.create 'stacks',

        description: '(dev) Test failure error stack navigator.'

        keyStrokes: (ch, key) ->

            try if key.ctrl and (key.name == 'c' or key.name == 'd')

                module.exports.disable()

                try

                    blessed.program().clear()

                    # blessed.program().showCursor()

                content = ''

                close()

            try

                return unless fails.length > 0

            catch

                return

            return unless fails.length

            try if key.name == 'return'

                objective.user.goto

                    type: 'dev.source.file.local'

                    filename: filename

                    line: linenumber

                    column: columnnumber

            try if key.name == 'up'

                testPosition++

                if testPosition > fails.length - 1

                    testPosition = fails.length - 1 

                    bell()

                    return

                render true

            try if key.name == 'down'

                testPosition--

                if testPosition < 0

                    testPosition = 0

                    bell()

                    return

                render true

            try if key.name == 'left'

                stepPosition--

                if stepPosition < 0

                    stepPosition = 0

                    bell()

                    return

                render true

            try if key.name == 'right'

                stepPosition++

                if stepPosition > stack.length - 1

                    stepPosition = stack.length - 1

                    bell()

                    return

                render true


        run: (args, callback) ->

            module.exports.enable()

            close = callback

            unless screen?

                screen = blessed.screen
                
                    autoPadding: true
                    smartCSR: true

            unless text?

                text = blessed.text

                    top: 'top'
                    left: 'left'
                    content: "Waiting for test."

                screen.append text

            try

                blessed.program().clear()

                # blessed.program().hideCursor()

            text.setContent "Waiting for test."

            screen.render()


        help: """

        After each test run a new batch of failures will appear.

        Use 'up' and 'down' arrows to navigate previous and next failure.

        Use 'left' and 'right' to step into the stack of the current failure.

        """

pipeline.on 'dev.test.before.all', ->

    return unless enabled

    fails = []

    # content = "" if content.match /failed/

    try 
        text.setContent content
        screen.render()


pipeline.on 'dev.test.after.each', ({test}) ->

    return unless enabled

    content ||= ''

    colour = if test.error? then 'red' else 'green' 

    if test.type == 'test'

        content += "T"[colour]

    else if test.type.match /beforeAll/

        content += "B"[colour]

    else if test.type.match /beforeEach/

        content += "b"[colour]

    else if test.type.match /afterAll/

        content += "A"[colour]

    else if test.type.match /afterEach/

        content += "a"[colour]
    

    try 

        text.setContent content
        screen.render()


pipeline.on 'dev.test.after.all', ({functions}) ->

    return unless enabled

    fails = for fn in functions

        continue unless fn.error?

        fn

    if fails.length == 0

        testPosition = 0 

        stepPosition = 0

        return render()

    if testPosition > fails.length - 1

        testPosition = 0 

    if stepPosition > fails[testPosition].error.stack.length - 1

        stepPosition = 0

    # testPadLength = fails.length.toString().length

    render()
        
