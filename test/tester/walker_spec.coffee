require '../_fake_objective'

describe 'Tester Walker', ->

    should   = require 'should'
    walker   = require '../../lib/tester/walker'
    injector = require '../../lib/tester/injector'
    runner   = require '../../lib/tester/runner'
    dev      = require '../../'
    shortid  = require 'shortid'

    before (done) -> 
        @original_generate = shortid.generate
        @original_mock = injector.mock
        @original_inject = injector.load
        @original_runner = runner.run

        @args = 
            root: config: uuid: 'ROOT_UUID'
            config: 
                title: 'Objective Title'
            required: {}

        dev.create @args.root, {}, -> done()

    beforeEach ->
        @args = 
            root: 
                config: uuid: 'ROOT_UUID'
                children: CHILD_UUID: {}
            config: 
                title: 'Objective Title'
                uuid: 'CHILD_UUID'
            required: {}

        shortid.generate = -> 'XXX'
        injector.mock = ->
        injector.load = ->
        runner.run = ->

    after ->
        shortid.generate = @original_generate
        injector.mock = @original_mock
        injector.load = @original_inject
        runner.run = @original_runner


    context 'reset()', ->

        it 'resets the test tree and places the promise', (done) ->

            walker.reset @args

            delete dev.tree.fn

            dev.tree.should.eql

                id: 'XXX'
                hooks: 
                    beforeAll: []
                    beforeEach: []
                    afterAll: []
                    afterEach: []
                type: 'root'
                str: 'Objective Title'
                skip: false
                pend: false
                children: []
                info:
                    file: ''
                    line: ''
                    col: ''
                    type: 'root'
                parent: null
                path: ['Objective Title']
                only: false
                error: null

            promise = objective.childPromise

            promise.should.equal test_it()

            runner.run = (deferral, root, tree) ->

                tree.should.eql dev.tree
                done()

            promise.start()



    context 'describe() / context()', ->

        it 'inserts a child into the current test node', ->

            walker.reset @args

            test_context 'string', ->

            dev.tree.children.length.should.equal 1


        it 'nesting nests', ->

            walker.reset @args

            test_context 'outer', ->
                test_context 'inner', -> # empty means pending

            dev.tree.children[0].str.should.equal 'outer'
            dev.tree.children[0].type.should.equal 'context'
            dev.tree.children[0].children[0].str.should.equal 'inner'
            dev.tree.children[0].children[0].type.should.equal 'context'
            dev.tree.children[0].children[0].pend.should.equal true


        it 'injects', ->

            walker.reset @args

            injected = []
            injector.load = (args...) ->
                injected.push args[2]

            test_context 'outer', (pretend, args) ->

            injected.should.eql ['pretend', 'args']


    context 'context.only()', ->

        it 'marks the tree and the context as only', ->

           walker.reset @args
           test_context.only 'context', ->

           dev.tree.only.should.equal true 
           dev.tree.children[0].only.should.equal true


    context 'xcontext()', ->

        it 'marks the context as pending', ->

            walker.reset @args
            test_xcontext 'context', ->

            dev.tree.children[0].pend.should.equal true


    context 'it()', ->

        it 'inserts a test into the current node', ->

            walker.reset @args

            test_it 'test1', ->
            test_context 'context', ->
                test_it 'test2', ->

            dev.tree.children[0].type.should.equal 'it'
            dev.tree.children[1].children[0].type.should.equal 'it'


        it 'is pending function is empty', ->

            walker.reset @args

            test_it 'test1', ->

            dev.tree.children[0].pend.should.equal true


    context 'xit()', ->

        it 'sets pending', ->

            walker.reset @args

            test_xit 'test1', ->

            dev.tree.children[0].pend.should.equal true


    context 'it.only()', ->

        it 'marks onlyness', ->

            walker.reset @args

            test_it.only 'test1', ->

            dev.tree.children[0].only.should.equal true
            dev.tree.only.should.equal true


    context 'before()', ->

        it 'inserts a beforeAll into the current node', ->

            walker.reset @args

            test_before ->
            test_context 'context', ->
                test_before ->

            dev.tree.hooks.beforeAll.length.should.equal 1
            dev.tree.children[0].hooks.beforeAll.length.should.equal 1

        it 'can be used to define each and all', ->

            walker.reset @args

            test_before
                each: ->
                all: ->

            dev.tree.hooks.beforeAll.length.should.equal 1
            dev.tree.hooks.beforeEach.length.should.equal 1


    context 'xbefore()', ->

        it 'does nothing', ->

            walker.reset @args
            test_xbefore ->
            dev.tree.hooks.beforeAll.length.should.equal 0


    context 'beforeEach()', ->

        it 'inserts a beforeEach into the current node', ->

            walker.reset @args

            test_beforeEach ->
            test_beforeEach ->
            test_beforeEach ->

            dev.tree.hooks.beforeEach.length.should.equal 3


    context 'after()', ->

        it 'inserts after hook', ->

            walker.reset @args

            test_after ->
            test_after ->
            dev.tree.hooks.afterAll.length.should.equal 2

        it 'can do each and all', ->

            walker.reset @args
            test_after
                each: ->
                all: ->
            dev.tree.hooks.afterAll.length.should.equal 1
            dev.tree.hooks.afterEach.length.should.equal 1


    context 'afterEach()', ->

        it 'inserts afterEach', ->

            walker.reset @args
            test_afterEach ->
            test_context 'context', ->
                test_afterEach ->

            dev.tree.hooks.afterEach.length.should.equal 1
            dev.tree.children[0].hooks.afterEach.length.should.equal 1  



    context 'walkStep', ->

        it 'returns the current tree node in the same format as runner.runStep', (done) ->

            walker.reset @args

            should.exist dev.walkStep.root
            should.exist dev.walkStep.config
            should.exist dev.walkStep.step

            dev.walkStep.step.node.type.should.equal 'root'

            test_context 'STR', ->

                dev.walkStep.step.node.type.should.equal 'context'
                dev.walkStep.step.node.str.should.equal 'STR'

                test_context 'ING', ->

                    dev.walkStep.step.node.str.should.equal 'ING'
                    done()


