shortid = require 'shortid'

{pipe, logger} = objective

{debug, error, info, TODO} = logger

TODO 'how to create multiple expectations with does over and over'

TODO 'reporter function/class name'

entities = {}

config = undefined

module.exports.before = (conf) ->

    config = conf

module.exports.create = (object) ->

    try Object.defineProperty object, '$$id', value: shortid.generate(), writable: false

    object.does = (functions) ->

        for name of functions

            do (name) ->

                o = entities[object.$$id] ||= 

                    object: object
                    expectations: {}
                    originals: {}

                type = 'mock'

                fn = functions[name]

                if name.match /^\$\$/

                    type = 'spy' 

                    name = name[2..]

                o.expectations[name] ||= []

                o.expectations[name].push type: type, fn: fn

                o.originals[name] ||= object[name] || -> ### NO_ORIGINAL ###

                if object[name]?

                    return if object[name].toString().match /EXPECTATION_STUB/

                object[name] = ->

                    ### EXPECTATION_STUB ###

                    try 

                        {type, fn} = entities[object.$$id].expectations[name].shift()

                    catch

                        e = new Error "Too many calls to function '#{name}()'"
                        e.name = 'ExpectationError'
                        throw e

                    if type == 'spy'

                        original = entities[object.$$id].originals[name] || ->

                    fn.apply object, arguments

                    original.apply object, arguments if original?




    return object

pipe.on 'dev.test.after.each', ({test}) ->

    return unless test.type == 'test'

    return if test.error? and test.error.name != 'Timeout'

    debug 'checking for failed expectations'

    failed = false

    report = {}

    for id of entities

        {object, expectations, originals} = entities[id]

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

    for id of entities

        {object, originals} = entities[id]

        for name of originals

            fn = originals[name]

            if fn.toString().match /NO_ORIGINAL/

                delete object[name]

                continue 

            object[name] = fn

    delete entities[id] for id of entities




