# TODO: .only on description, context

try
    
    {pipe} = objective
    pipe.createEvent 'dev.test.before.all'
    pipe.createEvent 'dev.test.after.all'
    pipe.createEvent 'dev.test.before.each'
    pipe.createEvent 'dev.test.after.each'

    {logger} = objective
    {info, debug, error} = logger

catch
    
    console.log 'not running objective'
    process.exit 1

{When, sequence, deferred, util} = require 'also'

{logger} = objective

{TODO} = logger

TODO 'do chai asserts work?'

TODO 'done called multiple times'

injector = require './injector'

running = undefined

tree = undefined

pointer = undefined

module.exports.before = (config) ->
        
    delete tree[key] for key of tree

    debug 'loading tests...'

    running = When.defer()

    running.promise.start = runTests

    tree = createNode null, 'root', 'root', ->

    pointer = tree

    tree.only = false

    return true

createNode = (parent, type, str, fn, skip) ->

    recurse = (parent, parts = []) ->

        parts.push parent.str
        return parts unless parent.parent?
        return recurse parent.parent, parts

    if parent?

        namePath = recurse(parent, [str]).reverse()

    node =

        hooks:
            beforeAll: []
            beforeEach: []
            afterEach: []
            afterAll: []
        type: type
        str: str
        fn: fn || ->
        skip: skip
        pending: not fn?
        children: []
        parent: parent
        path: namePath
        error: null

    return node

begin = -> return running?

end = -> return running.promise


runTests = ->

    pipe.emit 'dev.test.before.all', tree: tree, (err) ->

        if err? then return running.reject err

        debug 'running tests...'

        recurse = (pointer, functions = []) ->

            debug "recursing #{pointer.str}"

            {parent, children, type} = pointer

            if parent? and type == 'it' and (not tree.only or pointer.only)

                recurse2 = (parent, functions = []) ->

                    functions.push fn: fn, node: pointer, type: 'beforeEach' for fn in parent.hooks.beforeEach.reverse()

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

            if parent? and type == 'it' and (not tree.only or pointer.only)

                recurse3 = (parent, functions = []) ->

                    functions.push fn: fn, node: pointer, type: 'afterEach' for fn in parent.hooks.afterEach

                    return functions unless parent.parent?

                    return recurse3 parent.parent, functions

                functions.push ref for ref in recurse3 parent

            functions.push fn: fn, node: pointer, type: 'afterAll' for fn in pointer.hooks.afterAll

            return unless type == 'root'

            context = {}

            sequence(

                for test in functions

                    do (test) -> deferred ({resolve, reject, notify}) ->

                        try

                            timeout = undefined

                            done = undefined

                            return resolve() if test.node.pending

                            return resolve() if test.node.skip

                            test.argNames = util.argsOf test.fn

                            context.test = test

                            tooSlow = ->

                                e = new Error 'Timeout'

                                e.name = 'Timeout'

                                test.error = e

                                pipe.emit 'dev.test.after.each', test: test, (err) ->

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

                            for arg in test.argNames

                                if arg == 'done'

                                    timeout = setTimeout tooSlow, 2000

                                    doWithArgs.push done = ->

                                        clearTimeout timeout

                                        pipe.emit 'dev.test.after.each', test: test, (err) ->

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

                            return reject e

                        pipe.emit 'dev.test.before.each', test: test, (err) ->

                            # perhaps only start test timeout after before.each pipe

                            if err?

                                clearTimeout timeout if timeout?

                                return reject err

                            try

                                debug "running '#{test.type}' at '#{test.node.str}'"

                                test.fn.apply context, doWithArgs

                                return if done?

                                pipe.emit 'dev.test.after.each', test: test, (err) ->

                                    if err? then return reject err

                                    resolve()

                            catch e

                                clearTimeout timeout if timeout?

                                test.error = e

                                test.node.error = e if test.type == 'test'

                                pipe.emit 'dev.test.after.each', test: test, (err) ->

                                    if err? then return reject err

                                    # failing tests dont stop the entire chain

                                    return resolve() if test.type == 'test'

                                    # failing hooks do

                                    return reject e


            ).then(

                (result) ->

                    pipe.emit 'dev.test.after.all',

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

                (error) ->

                    pipe.emit 'dev.test.after.all', 

                        error: error
                        tree: tree
                        functions: functions

                        (err) ->

                            if err?

                                running.reject err
                                running = undefined
                                tree = undefined
                                return

                            running.reject error
                            running = undefined
                            tree = undefined

                (notify) ->

                    running.notify notify

            )

        recurse tree



global.before = (fn) ->

    return unless begin()

    if typeof fn == 'object'

        pointer.hooks.beforeEach.push fn.each if fn.each? and typeof fn.each is 'function'

        pointer.hooks.beforeAll.push fn.all if fn.all? and typeof fn.all is 'function'

    else

        pointer.hooks.beforeAll.push fn if typeof fn is 'function'

    return end()

global.beforeAll = (fn) ->

    return unless begin()

    pointer.hooks.beforeAll.push fn if typeof fn is 'function'

    return end()

global.beforeEach = (fn) ->

    return unless begin()

    pointer.hooks.beforeEach.push fn if typeof fn is 'function'

    return end()

global.afterEach = (fn) ->

    return unless begin()

    pointer.hooks.afterEach.push fn if typeof fn is 'function'

    return end()

global.afterAll = (fn) ->

    return unless begin()

    pointer.hooks.afterAll.push fn if typeof fn is 'function'

    return end()

global.after = (fn) ->

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

    pointer.argNames = util.argsOf fn

    pointer.arguments = {}

    doWithArgs = []

    for arg in pointer.argNames

        doWithArgs.push ument = injector.load arg

        pointer.arguments[arg]=ument

    fn.apply null, doWithArgs

    pointer = prevPointer

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

    pointer.argNames = util.argsOf fn

    pointer.arguments = {}

    doWithArgs = []

    for arg in pointer.argNames

        doWithArgs.push ument = injector.load arg

        pointer.arguments[arg]=ument

    fn.apply null, doWithArgs

    pointer = prevPointer

    return end()

global.context = context

global.xcontext = xcontext

global.describe = context

global.xdescribe = xcontext

global.it = (str, fn) ->

    return unless begin()

    skip = false

    pointer.children.push createNode pointer, 'it', str, fn, skip

    return end()

global.it.only = (str, fn) ->

    return unless begin()

    skip = false

    pointer.children.push createNode pointer, 'it', str, fn, skip

    pointer.children[-1..][0].only = true

    tree.only = true

    return end()

global.xit = (str, fn) ->

    return unless begin()

    skip = true

    pointer.children.push createNode pointer, 'it', str, fn, skip

    return end()
