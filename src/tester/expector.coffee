shortid = require 'shortid'

injector = require './injector'

{pipe, logger} = objective

{debug, error, info, TODO} = logger

TODO 'how to create multiple expectations with does over and over'

TODO 'reporter function/class name'

module.exports.entities = entities = {}

config = undefined

module.exports.before = (conf) ->

    config = conf

module.exports.create = (object) ->

    expectorName = 'does'

    try expectorName = dev.expectorName

    try Object.defineProperty object, '$$id', value: shortid.generate(), writable: false

    upperExpectorName = expectorName[0].toUpperCase() + expectorName[1..]

    if upperExpectorName == expectorName

        upperExpectorName = '$' + upperExpectorName

    object[upperExpectorName] = (args...) ->

        ### .Does (for expectations on class methods) ###

        args.unshift true

        object[expectorName].apply null, args

    pendingContexts = []

    object[expectorName] = (onClass, args...) ->

        # console.log arguments

        ### .does (for expectations on instance methods) ###

        try testType = dev.running.test.type

        if ['beforeAll','afterAll','afterEach'].indexOf(testType) != -1

            throw (
                e = new Error 'Cannot create expectation in ' + testType
                e.name = 'ExpectationError'
                e
            )

        pendingContexts.length = 0 # reset

        unless typeof onClass == 'boolean'

            args.unshift onClass

            onClass = false

        for functions in args

            for name of functions

                do (name) ->

                    n = object.constructor.name
                    objectType = 'object'

                    if name == 'constructor'

                        e = new Error "Cannot manipulate constructor."
                        e.name = 'ExpectationError'
                        throw e

                    try

                        n = object.prototype.constructor.name
                        objectType = 'class' # testing on future instance via prototype

                    o = entities[object.$$id] ||= 

                        type: objectType
                        name: n
                        object: object
                        expectations: {}
                        calls: {}
                        originals: {}

                    type = 'mock'

                    fn = functions[name]

                    if name.match /^\$\$/

                        type = 'spy' 

                        name = name[2..]

                    o.expectations[name] ||= {}

                    o.expectations[name][onClass] ||= []

                    o.expectations[name][onClass].push type: type, fn: fn, context: null

                    pendingContexts.push o.expectations[name][onClass][-1..][0] # for .as()

                    o.calls[name] ||= {}

                    o.calls[name][onClass] ||= []

                    o.originals[name] ||= {}

                    o.originals[name][onClass] ||= {}

                    o.originals[name][onClass].type = objectType

                    if objectType == 'class'

                        if onClass

                            o.originals[name][onClass].fn = object[name] || -> ### NO_ORIGINAL ###

                        else

                            o.originals[name][onClass].fn = object.prototype[name] || -> ### NO_ORIGINAL ###

                    else

                        o.originals[name][onClass].fn = object[name] || -> ### NO_ORIGINAL ###

                    

                    if object[name]?

                        return if object[name].toString().match /EXPECTATION_STUB/


                    stub = ->

                        ### EXPECTATION_STUB ###

                        expected = false

                        try

                            {type, fn, context} = entities[object.$$id].expectations[name][onClass].shift()

                            expected = true

                        fn ||= ->

                        entities[object.$$id].calls[name][onClass].push call =

                            type: type
                            fn: fn
                            context: context
                            arguments: arguments
                            expected: expected
                            error: null
                            result: null


                        if type == 'spy'

                            original = entities[object.$$id].originals[name][onClass].fn || ->

                        try

                            call.result = result = fn.apply context || object, arguments

                        catch e

                            call.error = e

                        result = original.apply context || object, arguments if original?

                        return result


                    return object[name] = stub unless objectType == 'class'

                    return object[name] = stub if onClass == true

                    object.prototype[name] = stub

        # console.log entities

        as: (context) ->

            for expectation in pendingContexts

                expectation.context = context

    return object


module.exports.mock = (args...) ->

    if typeof args[0] == 'string'

        name = args[0]
        
        object = args[1] || {}

    else

        object = args[0]

    result = module.exports.create object

    if name?

        injector.register name, result

        Object.defineProperty result, '$$name', value: name, enumerable: false

    return result


Object.defineProperty Object.prototype, 'mock',
    
    value: module.exports.mock

    configurable: false



pipe.on 'dev.test.after.each', ({test}) ->

    return unless test.type == 'test'

    return if test.error? and test.error.name != 'Timeout'

    debug 'checking for failed expectations'

    failed = false

    report = {}

    for id of entities

        {object, expectations, calls} = entities[id]

        try

            constructorName = object.constructor.name
            objectName = "#{object.$$name} [#{constructorName}]"

        catch

            objectName = object.$$name


        report[objectName] ||= functions: {}

        errorString = "Function expectations were not met"

        for name of expectations

            for onClass of expectations[name]

                functionName = name + '()'

                remaining = expectations[name][onClass].length

                runExpected = 0

                runUnexpected = 0

                for {expected, error} in calls[name][onClass]

                    errored = error if error?

                    runExpected++ if expected

                    runUnexpected++ unless expected

                if errored?

                    result = 

                        ERROR: errored.toString()

                        error: errored

                    errorString = "Exception in expectation"

                    failed = true

                else if remaining > 0

                    result = ERROR: "Ran #{runExpected} times of expected #{runExpected + remaining}"

                    failed = true

                else if runUnexpected == 0

                    result = OK: "Ran #{runExpected} times as expected"

                else if runUnexpected != 0

                    result = ERROR: "Ran #{runExpected + runUnexpected} times of expected #{runExpected}"

                    failed = true

                report[objectName].functions[functionName] = result


    if failed

        e = new Error errorString

        e.name = 'ExpectationError'

        e.detail = report

        test.error = e

        test.node.error = e


pipe.on 'dev.test.after.each', ({test}) ->

    return unless test.type == 'test'

    debug 'clear expectations'

    TODO 'remove entities from injector if not still in play'
    TODO 'remove expectations if no longer in play (deleted does and fn hangs about)'

    for id of entities

        {object, originals, calls, expectations} = entities[id]

        for name of originals

            for onClass of originals[name]

                fn = originals[name][onClass].fn

                if fn.toString().match /NO_ORIGINAL/

                    delete object[name]

                    continue

                ####### class? instance? prototype? restore!.

                object[name] = fn

            delete calls[name]

            delete expectations[name]

            delete originals[name]




