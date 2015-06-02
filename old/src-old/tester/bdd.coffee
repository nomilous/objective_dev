# TODO: .only on description, context

try
    
    {pipeline} = objective
    pipeline.createEvent 'dev.test.before.all'
    pipeline.createEvent 'dev.test.after.all'
    pipeline.createEvent 'dev.test.before.each'
    pipeline.createEvent 'dev.test.after.each'

    {logger} = objective
    {info, error} = logger
    debug = logger.createDebug 'bdd'

    # dev.test = 

    #     tree: null
    #     recursingNode: null
    #     running: null

catch
    
    console.log 'not running objective'
    process.exit 1

{generate} = require 'shortid'

{util} = require 'also'

{defer, promise} = require 'when'

sequence = require 'when/sequence'

{logger} = objective

{TODO} = logger

TODO 'do chai asserts work?'

TODO 'done called multiple times'

TODO 'empty function still pending'

injector = require './injector'

running = undefined

tree = undefined

pointer = undefined

module.exports.$$beforeEach = (config) ->
        
    delete tree[key] for key of tree

    debug 'loading tests...'

    running = defer()

    running.promise.start = runTests

    title = objective.currentChild.config.title

    tree = createNode null, 'root', title, ->

    pointer = tree

    objective.plugins.dev.tree = tree

    objective.plugins.dev.running = {}

    objective.plugins.dev.recursing = {}

    objective.plugins.dev.recursing.node = pointer

    tree.only = false

    return true

createNode = (parent, type, str, fn, skip) ->

    recurse = (parent, parts = []) ->

        parts.push parent.str
        return parts unless parent.parent?
        return recurse parent.parent, parts

    namePath = if parent? then recurse(parent, [str]).reverse() else [str]

    pending = not fn?

    try if fn.toString() == 'function () {}'

        pending = true

    node =

        id: generate()
        hooks:
            beforeAll: []
            beforeEach: []
            afterEach: []
            afterAll: []
        type: type
        str: str
        fn: fn # || ->
        skip: skip
        pending: pending
        children: []
        parent: parent
        path: namePath
        error: null

    return node

begin = -> return running?

end = -> return running.promise


runTests = ->

    pipeline.emit 'dev.test.before.all', tree: tree, (err) ->

        if err? then return running.reject err

        debug 'running tests...'

        recurse = (pointer, functions = []) ->

            debug "recursing #{pointer.str}"

            {parent, children, type, fn} = pointer

            if parent? and type == 'it' and fn? and (not tree.only or pointer.only)

                recurse2 = (parent, functions = []) ->

                    functions.push fn: fn, node: pointer.parent, type: 'beforeEach' for fn in parent.hooks.beforeEach.reverse()

                    return functions unless parent.parent?

                    return recurse2 parent.parent, functions

                functions.push ref for ref in recurse2(parent).reverse()

            functions.push fn: fn, node: pointer, type: 'beforeAll' for fn in pointer.hooks.beforeAll

            unless pointer.skip

                if type == 'it'

                    if tree.only

                        functions.push fn: pointer.fn, node: pointer, type: 'test' if pointer.only

                    else

                        functions.push fn: pointer.fn, node: pointer, type: 'test'

                else recurse child, functions for child in children

            if parent? and type == 'it' and fn? and (not tree.only or pointer.only)

                recurse3 = (parent, functions = []) ->

                    functions.push fn: fn, node: pointer.parent, type: 'afterEach' for fn in parent.hooks.afterEach

                    return functions unless parent.parent?

                    return recurse3 parent.parent, functions

                functions.push ref for ref in recurse3 parent

            functions.push fn: fn, node: pointer, type: 'afterAll' for fn in pointer.hooks.afterAll

            return unless type == 'root'

            

            if functions.length == 0

                return pipeline.emit 'dev.test.after.all',

                    error: null
                    tree: tree
                    functions: functions

                    (err) ->

                        if err?

                            running.reject err
                            running = undefined
                            tree = undefined
                            return

                        running.resolve result
                        running = undefined
                        tree = undefined

            context = {}

            sequence(

                for test in functions

                    do (test) -> -> promise (resolve, reject, notify) ->

                        try

                            timeout = undefined

                            done = undefined

                            objective.plugins.dev.running.test = test

                            test.filename = objective.currentChild.config.filename

                            return resolve() if test.node.pending and test.type == 'test'

                            return resolve() if test.node.skip

                            debug "running test: #{test.fn.toString()}"

                            test.argNames = util.argsOf test.fn

                            context.test = test

                            tooSlow = ->

                                e = new Error "Timeout in #{test.type}"

                                e.name = 'Timeout'

                                test.error = e

                                test.endedAt = Date.now()

                                pipeline.emit 'dev.test.after.each', test: test, (err) ->

                                    if err? then return reject err

                                    return resolve() if test.type == 'test'

                                    # timeout on hook fails entire run

                                    reject e

                            context.timeout = (value) ->

                                return unless timeout?

                                return unless typeof value == 'number'

                                clearTimeout timeout

                                timeout = setTimeout tooSlow, value

                            doWithArgs = []

                            doneCalls = 0

                            for arg in test.argNames

                                if arg == 'done'

                                    timeout = setTimeout tooSlow, 2000

                                    doWithArgs.push done = ->

                                        clearTimeout timeout

                                        test.endedAt = Date.now()

                                        doneCalls++

                                        if doneCalls > 1

                                            e = new Error "Done called multiple times"

                                            e.name = 'ExpectationError'

                                            test.error = e

                                            test.node.error = e

                                        pipeline.emit 'dev.test.after.each', test: test, (err) ->

                                            if err? then return reject err

                                            resolve()

                                else

                                    doWithArgs.push injector.load arg

                            test.arguments = {}

                            i = 0

                            for arg in test.argNames
                                
                                test.arguments[arg] = doWithArgs[i++]

                            test.error = null

                        catch e

                            # error e.stack

                            test.error = e

                            test.node.error = e

                            clearTimeout timeout if timeout?

                            # return reject e

                        pipeline.emit 'dev.test.before.each', test: test, (err) ->

                            # perhaps only start test timeout after before.each pipe

                            if err?

                                clearTimeout timeout if timeout?

                                return reject err

                            try

                                debug "running '#{test.type}' at '#{test.node.str}'"

                                test.startedAt = Date.now()

                                test.fn.apply context, doWithArgs

                                return if done?

                                test.endedAt = Date.now()

                                pipeline.emit 'dev.test.after.each', test: test, (err) ->

                                    if err? then return reject err

                                    resolve()

                            catch e

                                clearTimeout timeout if timeout?

                                test.endedAt = Date.now()

                                unless e.name == 'TestDone'

                                    test.error = e

                                    test.node.error = e if test.type == 'test'

                                test.done = e

                                pipeline.emit 'dev.test.after.each', test: test, (err) ->

                                    if err? then return reject err

                                    # failing tests dont stop the entire chain

                                    return resolve() if test.type == 'test'

                                    # failing hooks do

                                    return reject e


            ).then(

                (result) ->

                    objective.plugins.dev.running = {}

                    pipeline.emit 'dev.test.after.all',

                        error: null
                        tree: tree
                        functions: functions

                        (e) ->

                            if e?

                                running.reject e
                                running = undefined
                                tree = undefined
                                return

                            running.resolve result
                            running = undefined
                            tree = undefined

                (err) ->

                    objective.plugins.dev.running = {}

                    pipeline.emit 'dev.test.after.all',

                        error: err
                        tree: tree
                        functions: functions

                        (e) ->

                            if objective.noRoot

                                return running.resolve e

                            if e?

                                running.reject e
                                running = undefined
                                tree = undefined
                                return

                            running.reject err
                            running = undefined
                            tree = undefined

                (notify) ->

                    running.notify notify

            )

        recurse tree



global.before ||= (fn) ->

    return unless begin()

    if typeof fn == 'object'

        pointer.hooks.beforeEach.push fn.each if fn.each? and typeof fn.each is 'function'

        pointer.hooks.beforeAll.push fn.all if fn.all? and typeof fn.all is 'function'

    else

        pointer.hooks.beforeAll.push fn if typeof fn is 'function'

    return end()

global.beforeAll ||= (fn) ->

    return unless begin()

    pointer.hooks.beforeAll.push fn if typeof fn is 'function'

    return end()

global.beforeEach ||= (fn) ->

    return unless begin()

    pointer.hooks.beforeEach.push fn if typeof fn is 'function'

    return end()

global.afterEach ||= (fn) ->

    return unless begin()

    pointer.hooks.afterEach.push fn if typeof fn is 'function'

    return end()

global.afterAll ||= (fn) ->

    return unless begin()

    pointer.hooks.afterAll.push fn if typeof fn is 'function'

    return end()

global.after ||= (fn) ->

    return unless begin()

    if typeof fn == 'object'

        pointer.hooks.afterEach.push fn.each if fn.each? and typeof fn.each is 'function'

        pointer.hooks.afterAll.push fn.all if fn.all? and typeof fn.all is 'function'

    else

        pointer.hooks.afterAll.push fn if typeof fn is 'function'

    return end()

context = (str, fn) ->

    return unless begin()

    skip = false

    unless fn?

        pointer.children.push createNode pointer, 'context', str, fn, skip

        return end()

    prevPointer = pointer

    pointer.children.push createNode pointer, 'context', str, fn, skip

    pointer = pointer.children[-1..][0]

    objective.plugins.dev.recursing.node = pointer

    pointer.argNames = util.argsOf fn

    pointer.arguments = {}

    doWithArgs = []

    for arg in pointer.argNames

        doWithArgs.push ument = injector.load arg

        pointer.arguments[arg]=ument

    fn.apply null, doWithArgs

    pointer = prevPointer

    objective.plugins.dev.recursing.node = pointer

    return end()

xcontext = (str, fn) ->

    return unless begin()

    skip = true

    unless fn?

        pointer.children.push createNode pointer, 'context', str, fn, skip

        return end()

    prevPointer = pointer

    pointer.children.push createNode pointer, 'context', str, fn, skip

    pointer = pointer.children[-1..][0]

    objective.plugins.dev.recursing.node = pointer

    pointer.argNames = util.argsOf fn

    pointer.arguments = {}

    doWithArgs = []

    for arg in pointer.argNames

        doWithArgs.push ument = injector.load arg

        pointer.arguments[arg]=ument

    fn.apply null, doWithArgs

    pointer = prevPointer

    objective.plugins.dev.recursing.node = pointer

    return end()

global.context ||= context

global.xcontext ||= xcontext

global.describe ||= context

global.xdescribe ||= xcontext

global.it ||= (str, fn) ->

    return unless begin()

    skip = false

    pointer.children.push createNode pointer, 'it', str, fn, skip

    return end()

global.it.only ||= (str, fn) ->

    return unless begin()

    skip = false

    pointer.children.push createNode pointer, 'it', str, fn, skip

    pointer.children[-1..][0].only = true

    tree.only = true

    return end()

global.xit ||= (str, fn) ->

    return unless begin()

    skip = true

    pointer.children.push createNode pointer, 'it', str, fn, skip

    return end()

