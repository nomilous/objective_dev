# TODO: .only on description, context

{When, sequence, deferred, util} = require 'also'

injector = require './injector'

running = undefined

tree = undefined

pointer = undefined

module.exports.before = (config) ->
        
    delete tree[key] for key of tree

    console.log 'Loading tests...'

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

    try path = '/' + (recurse parent, [str]).reverse().join '/'

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
    path: path

begin = -> return running?

end = -> return running.promise


runTests = ->

    console.log 'Running tests...'

    recurse = (pointer, functions = []) ->

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

                        test.args = util.argsOf test.fn

                        context.test = test

                        tooSlow = ->

                            console.log 'timeout!'

                            resolve()

                        context.timeout = (value) ->

                            return unless timeout?

                            return unless typeof value == 'number'

                            clearTimeout timeout

                            timeout = setTimeout tooSlow, value

                        doWithArgs = []

                        for arg in test.args

                            if arg == 'done'

                                timeout = setTimeout tooSlow, 2000

                                doWithArgs.push done = ->

                                    clearTimeout timeout

                                    resolve()
                            else

                                doWithArgs.push injector.load arg

                        try

                            test.fn.apply context, doWithArgs

                            resolve() unless done?

                        catch e

                            clearTimeout timeout if timeout?

                            if test.type == 'test'

                                console.log testError: e.toString()
                                return resolve()

                            return reject e

                    catch e

                        return reject e

        ).then(

            (result) ->

                running.resolve result
                running = undefined
                tree = undefined

            (error) ->

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

global.context = (str, fn) ->

    return unless begin()

    skip = false

    unless fn?

        pointer.children.push createNode pointer, 'context', str, fn, skip

        return end()

    prevPointer = pointer

    pointer.children.push createNode pointer, 'context', str, fn, skip

    pointer = pointer.children[-1..][0]

    fn()

    pointer = prevPointer

    return end()

global.xcontext = (str, fn) ->

    return unless begin()

    skip = true

    unless fn?

        pointer.children.push createNode pointer, 'context', str, fn, skip

        return end()

    prevPointer = pointer

    pointer.children.push createNode pointer, 'context', str, fn, skip

    pointer = pointer.children[-1..][0]

    fn()

    pointer = prevPointer

    return end()

global.describe = (str, fn) ->

    return unless begin()

    skip = false

    unless fn?

        pointer.children.push createNode pointer, 'describe', str, fn, skip

        return end()

    prevPointer = pointer

    pointer.children.push createNode pointer, 'describe', str, fn, skip

    pointer = pointer.children[-1..][0]

    fn()

    pointer = prevPointer

    return end()

global.xdescribe = (str, fn) ->

    return unless begin()

    skip = true

    unless fn?

        pointer.children.push createNode pointer, 'describe', str, fn, skip

        return end()

    prevPointer = pointer

    pointer.children.push createNode pointer, 'describe', str, fn, skip

    pointer = pointer.children[-1..][0]

    fn()

    pointer = prevPointer

    return end()

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

