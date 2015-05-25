
# originalShowError = undefined

enabled = false

origPrepareStackTrace = undefined

module.exports.enable = ->

    dev = require '../'

    enabled = true

    origPrepareStackTrace = Error.prepareStackTrace

    Error.prepareStackTrace = (_, stack) -> stack

    # originalShowError = dev.showError

    # dev.showError = false

    # dev.reporters.default.enable()



module.exports.disable = ->

    Error.prepareStackTrace = origPrepareStackTrace

    # dev.showError = originalShowError

    # dev.reporters.default.disable()


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

{EOL} = require 'os'

# testPadLength = 1

# stepPadLength = 1

stack = []

successCount = 0

filename = undefined

linenumber = undefined

columnnumber = undefined

currentTest = ->

    num = fails.length - 1 - testPosition

    fail = fails[fails.length - 1 - testPosition]

    path = fail.node.path

    pathLength = path.length

    # path[ pathLength - 1 ] = path[ pathLength - 1 ].bold

    "#{pad(2, (num + 1).toString(), '0')}".bold + " FAILED ".red.bold + path.join(' + ').bold

previousTest = ->

    num = fails.length - 2 - testPosition

    fail = fails[fails.length - 2 - testPosition]

    return '' unless fail?

    path = fail.node.path

    ("#{pad(2, (num + 1).toString(), '0')}".bold + " FAILED " + path.join ' + ').grey

nextTest = ->

    num = fails.length - testPosition

    fail = fails[fails.length - testPosition]

    return '' unless fail?

    path = fail.node.path

    ("#{pad(2, (num + 1).toString(), '0')}".bold + " FAILED " + path.join ' + ').grey


currentLine = -> 
    
    num = stepPosition

    data = stack[num]

    filename = data.getFileName()

    linenumber = parseInt data.getLineNumber()

    columnnumber = parseInt data.getColumnNumber()

    if filename? and linenumber?

        try

            result = EOL
        
            file = fs.readFileSync filename

            lines = file.toString().split EOL

            for i in [0..lines.length - 1]

                # continue unless i + objective.plugins.dev.walkWidth > linenumber
                # continue unless i - objective.plugins.dev.walkWidth < linenumber 
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

    # stepPadLength = stack.length.toString().length

    # #{previousLine()}

    """
    #{currentLine()}

    #{nextLines()}
    """


render = ->

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

    content += '|'

    beforeCount = count - testPosition - 1

    afterCount = testPosition

    fail = fails[fails.length - 1 - testPosition]

    try stack = fail.error.stack
    stack ||= []

    heading1 = "failed tests (#{count})".bold + "  up,down"

    try heading2 = fail.error.toString().red.bold

    heading2 ||= ""

    heading3 = "error stack (depth #{stack.length})" + "  left,right"

    failsText = """

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


{pipe} = objective

pipe.on 'prompt.commands.register.ask', (command) ->

    close = undefined

    bell = ->  # process.stdout.write '\u0007'

    command.create 'stacks',

        description: '(dev) Test failure error stack navigator.'

        keyStrokes: (ch, key) ->

            try if key.ctrl and (key.name == 'c' or key.name == 'd')

                module.exports.disable()

                blessed.program().clear()

                close()

            try

                return unless fails.length > 0

            catch

                return

            return unless fails.length

            try if key.name == 'return'

                objective.user.goto

                    type: 'dev.source.file'

                    filename: filename

                    line: linenumber

                    column: columnnumber

            try if key.name == 'up'

                testPosition++

                if testPosition > fails.length - 1

                    testPosition = fails.length - 1 

                    bell()

                    return

                render()

            try if key.name == 'down'

                testPosition--

                if testPosition < 0

                    testPosition = 0

                    bell()

                    return

                render()

            try if key.name == 'left'

                stepPosition--

                if stepPosition < 0

                    stepPosition = 0

                    bell()

                    return

                render()

            try if key.name == 'right'

                stepPosition++

                if stepPosition > stack.length - 1

                    stepPosition = stack.length - 1

                    bell()

                    return

                render()


        run: (args, callback) ->



            module.exports.enable()

            objective.plugins.dev.reporters.default.disable()

            close = callback

            unless screen?

                screen = blessed.screen
                
                    autoPadding: true
                    smartCSR: true

            # screen.append blessed.text 'o', {}

            unless text?

                text = blessed.text

                    top: 'top'
                    left: 'left'
                    content: "Waiting for test."

                screen.append text


            blessed.program().clear()


            process.nextTick ->

                text.setContent "Waiting for test."

                screen.render()





        help: """

        After each test run a new batch of failures will appear.

        Use 'up' and 'down' arrows to navigate previous and next failure.

        Use 'left' and 'right' to step into the stack of the current failure.

        """

pipe.on 'dev.test.before.all', ->

    return unless enabled

    fails = []

    # content = "" if content.match /failed/

    try 
        text.setContent content
        screen.render()


pipe.on 'dev.test.after.each', ({test}) ->

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


pipe.on 'dev.test.after.all', ({functions}) ->

    return unless enabled

    fails = for fn in functions

        continue unless fn.error?

        fn

    testPosition = 0

    stepPosition = 0

    # testPadLength = fails.length.toString().length

    render()
        
