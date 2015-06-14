require '../_fake_objective'

describe 'Tester Runner', ->

    dev = require '../../'
    walker = require '../../lib/tester/walker'
    runner = require '../../lib/tester/runner'
    promise = require('when').promise
    should = require 'should'

    before ->
        @recurse = runner.recurse
        @runTest = runner.runTest
        @runStep = runner.runStep
        @emit = objective.pipeline.emit

    beforeEach ->
        @args = 
            root: 
                config:
                    uuid: 'ROOT_UUID'
                children:
                    CHILD_UUID: {}
            config:
                title: 'Objective Title'
                uuid: 'CHILD_UUID'
            required: {}
        @deferral = resolve: ->

    afterEach ->
        runner.recurse = @recurse
        runner.runTest = @runTest
        objective.pipeline.emit = @emit
        runner.runStep = @runStep


    context 'run()', ->

        it 'recurses the tree and notifies before and after', (done) ->

            events = []

            objective.pipeline.emit = (event, payload, callback) ->
                events.push event
                callback null, payload

            runner.recurse = (root, config, testContext, tree) ->
                tree.should.eql dev.tree
                then: (resolve) -> resolve()

            walker.reset @args
            runner.run @deferral, @args, dev.tree

            events.should.eql [ 'dev.test.before.all', 'dev.test.after.all' ]
            done()

        it 'calls deferral resolve even if the recurse rejects', (done) ->
            # test fails dont stop testing

            @deferral = 
                resolve: -> done()

            objective.pipeline.emit = (event, payload, callback) ->
                callback null, payload

            runner.recurse = (root, config, testContext, tree) ->
                then: (resolve, reject) -> reject new Error 'moo'

            walker.reset @args
            runner.run @deferral, @args, dev.tree


    context 'assignSkip()', ->

        it 'flags all tests as skip except the one marked only', ->

            walker.reset @args

            test_it '', -> 1
            test_context '', ->
                test_it '', -> 1
                test_it.only 'this', ->

            runner.assignSkip dev.tree

            dev.tree.children[0].skip.should.equal true
            dev.tree.children[1].children[0].skip.should.equal true
            dev.tree.children[1].children[1].skip.should.equal false


    context 'recurse()', ->

        it 'recurses the tree and calls runTest with each testNode found', ->

            tests = []

            runner.runTest = (root, config, testContext, testNode) ->
                promise (resolve) ->
                    tests.push testNode.str
                    resolve()

            walker.reset @args
            test_it 'one', ->
            test_context '', ->
                test_it 'two', ->
                test_it 'three', ->
            test_context '', ->
                test_it 'four', ->
                test_it 'five', ->


            runner.recurse @args.root, @args.config, {}, dev.tree
            .then -> tests.should.eql [ 'one', 'two', 'three', 'four', 'five' ]


    context 'runTest()', ->

        beforeEach (done) ->
            walker.reset @args
            test_before -> 1
            test_before -> 2
            test_beforeEach -> 3
            test_beforeEach -> 4
            test_context 'context1', =>
                test_before -> 5
                test_before -> 6
                test_beforeEach -> 7
                test_it 'test1', -> 'TEST1'
                @testNode1 = dev.walkStep.step.node.children[0]
                test_it 'test2', -> 'TEST2'
                @testNode2 = dev.walkStep.step.node.children[1]
                test_afterEach -> 8
                test_afterEach -> 9
                test_after -> 10
                test_after -> 11
            test_afterEach -> 12
            test_afterEach -> 13
            test_after -> 14
            test_after -> 15
            done()


        it 'emits before each with test steps - 1', (done) ->

            objective.pipeline.emit = (event, payload, callback) =>

                if event == 'dev.test.before.each'

                    payload.root.should.eql @args.root
                    payload.config.should.eql @args.config
                    should.exist payload.test
                    should.exist payload.steps

                    results = payload.steps.map ({fn}) -> fn()
                    results.should.eql [ 1, 2, 3, 4, 5, 6, 7, 'TEST1', 8, 9, 12, 13 ]
                            # skips after alls, not last test
                    done()

            runner.runTest @args.root, @args.config, {}, @testNode1


        it 'emits before each with test steps - 2', (done) ->

            objective.pipeline.emit = (event, payload, callback) =>

                if event == 'dev.test.before.each'

                    results = payload.steps.map ({fn}) -> fn()
                    results.should.eql [ 3, 4, 7, 'TEST2', 8, 9, 10, 11, 12, 13, 14, 15 ]
                    done()

            # mark beforeAll as if run
            dev.tree.hooks.beforeAll[0].fn.runCount = 1
            dev.tree.hooks.beforeAll[1].fn.runCount = 1
            dev.tree.children[0].hooks.beforeAll[0].fn.runCount = 1
            dev.tree.children[0].hooks.beforeAll[1].fn.runCount = 1

            runner.runTest @args.root, @args.config, {}, @testNode2


        it 'calls runStep with each step', (done) ->

            objective.pipeline.emit = (event, payload, callback) ->

                if event == 'dev.test.before.each' then callback null, payload
                if event == 'dev.test.after.each'
                    results.should.eql [ 1, 2, 3, 4, 5, 6, 7, 'TEST1', 8, 9, 12, 13 ]
                    done()

            results = []
            runner.runStep = (root, config, testContext, step, resolve, reject) ->
                results.push step.fn()
                resolve()

            runner.runTest @args.root, @args.config, {}, @testNode1


        context 'runStep()', ->


            it 'sets the current step, the timer values and calls the step function', (done) ->

                step = runner.createStep 'info', 'test', @testNode1, @testNode1.fn
                reject = ->
                resolve = ->
                    dev.runStep.step.node.str.should.equal 'test1'
                    should.exist dev.runStep.step.startAt
                    should.exist dev.runStep.step.endAt
                    done()

                runner.runStep @args.root, @args.config, {}, step, resolve, reject
                

            it 'injects done if done is one of the args', (done) ->

                _done = done

                @testNode2.fn = (done) ->

                    done.should.be.an.instanceOf Function
                    done()
                    _done()

                step = runner.createStep 'info', 'test', @testNode2, @testNode2.fn
                reject = ->
                resolve = ->
                runner.runStep @args.root, @args.config, {}, step, resolve, reject


            it 'sets the test error as timeout if done is not called', (done) ->

                @testNode2.fn = (done) -> @timeout 10

                step = runner.createStep 'info', 'test', @testNode1, @testNode2.fn
                reject = ->
                resolve = ->
                runner.runStep @args.root, @args.config, {}, step, resolve, reject

                setTimeout (->
                    step.node.error.name.should.equal 'TimeoutError'
                    done()
                ), 20

            it 'cancels children if done is not called and step is hook', (done) ->

                hook = dev.tree.hooks.beforeEach[0]
                fn = hook.fn = (done) -> @timeout 10
                step = runner.createStep 'info', 'beforeEach', hook, fn
                step.node =
                    children: [
                        child = {children: []}
                    ]
                reject = ->
                resolve = ->
                    should.exist child.cancelled
                    should.exist child.cancelled.atStep
                    child.cancelled.error.toString.should.match /TimeoutError/
                    done()
                runner.runStep @args.root, @args.config, {}, step, resolve, reject




            it 'runs all tests on common context', (done) ->

                context = {}

                hook = dev.tree.hooks.beforeEach[0]
                hook.fn = -> @thing = 'X'
                step1 = runner.createStep 'info', 'beforeEach', hook, hook.fn

                @testNode2.fn = ->
                    @thing.should.equal 'X'
                    done()

                step2 = runner.createStep 'info', 'test', @testNode2, @testNode2.fn

                reject = ->
                resolve = =>
                    runner.runStep @args.root, @args.config, context, step2, (->), reject
                runner.runStep @args.root, @args.config, context, step1, resolve, reject


        context 'wait()', ->

            it 'suspends the test timeout and resolution and sets see', (done) ->

                _done = done

                @testNode1.fn = (done) ->
                    @timeout 10
                    thing = {a:1}
                    test_wait(thing)
                    done()

                step = runner.createStep 'info', 'test', @testNode1, @testNode1.fn

                reject = -> throw new Error 'shouldn\'t reject'
                resolve = -> throw new Error 'shouldn\'t resolve'

                runner.runStep @args.root, @args.config, {}, step, resolve, reject

                setTimeout (->

                    should.exist test_see
                    test_see.thing.should.eql a: 1
                    should.exist dev.runStep.waiting
                    should.not.exist step.node.error
                    test_see.done
                    done()

                ), 20






