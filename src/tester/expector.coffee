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

        ### .does (for expectations on instance methods) ###

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
                        name: object.name || n
                        object: object
                        expectations: {}
                        originals: {}

                    type = 'mock'

                    fn = functions[name]

                    if name.match /^\$\$/

                        type = 'spy' 

                        name = name[2..]

                    o.expectations[name] ||= []

                    o.expectations[name].push type: type, fn: fn, context: null

                    pendingContexts.push o.expectations[name][-1..][0] # for .with()

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

                        TODO 'dont throw Too many calls, report number as exception after instead'

                        try

                            {type, fn, context} = entities[object.$$id].expectations[name].shift()

                        catch

                            e = new Error "Too many calls to function '#{name}()'"
                            e.name = 'ExpectationError'
                            throw e

                        if type == 'spy'

                            original = entities[object.$$id].originals[name][onClass].fn || ->

                        result = fn.apply context || object, arguments

                        result = original.apply context || object, arguments if original?

                        return result


                    return object[name] = stub unless objectType == 'class'

                    return object[name] = stub if onClass == true

                    object.prototype[name] = stub

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

        {object, expectations} = entities[id]

        report[object.toString()] ||= {}

        for name of expectations

            funcName = name + '()'

            report[object.toString()][funcName] = 'OK'

            if expectations[name].length > 0

                report[object.toString()][funcName] = "PROBLEM - #{expectations[name].length} expectations remain"

                failed = true

    if failed

        e = new Error "Function expectations were not met"

        e.name = 'ExpectationError'

        e.detail = report

        test.error = e

        test.node.error = e


pipe.on 'dev.test.after.each', ({test}) ->

    return unless test.type == 'test'

    debug 'clear expectations unless created in beforeAll?'

    TODO 'EXPECTOR CLEARUP'

    delete entities[id] for id of entities


    # for id of entities

    #     {object, originals} = entities[id]

    #     for name of originals

    #         fn = originals[name].fn

    #         if fn.toString().match /NO_ORIGINAL/

    #             delete object[name]

    #             continue 

    #         object[name] = fn

    # delete entities[id] for id of entities




