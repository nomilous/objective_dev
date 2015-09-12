require '../_fake_objective'

describe 'Tester Expector', ->

    expector = require '../../lib/tester/expector'
    injector = require '../../lib/tester/injector'
    walker = require '../../lib/tester/walker'
    runner = require '../../lib/tester/runner'
    dev = require '../../'
    should = require 'should'

    before ->
        @mocker = expector.mocker
        delete injector.mocks[key] for key in injector.mocks
        @args = 
            root: 
                children: CHILD_UUID: {}
                config: uuid: 'ROOT_UUID_2'
            config:
                title: 'Objective Title'
                uuid: 'CHILD_UUID'
            required: {}

        dev.roots.ROOT_UUID_2 = config: {}

    beforeEach ->
        expector.mocker = @mocker


    after -> 
        expector.mocker = @mocker
        delete injector.mocks[key] for key in injector.mocks

    context 'on events', ->

        it 'todo'


    context 'createExpector()', ->

        it 'makes objects mockable', ->

            obj = {}

            expector.createExpector obj

            should.exist obj.$$mockid
            try obj.does
            catch e
                e.toString().should.match /out of test or hook/
            # try obj.Does
            # catch e
            #     e.toString().should.match /out of test or hook/
            try obj.mock
            catch e
                e.toString().should.match /out of test or hook/
            # try obj.Mock
            # catch e
            #     e.toString().should.match /out of test or hook/
            try obj.stub
            catch e
                e.toString().should.match /out of test or hook/
            # try obj.Stub
            # catch e
            #     e.toString().should.match /out of test or hook/
            try obj.spy
            catch e
                e.toString().should.match /out of test or hook/
            # try obj.Spy
            # catch e
            #     e.toString().should.match /out of test or hook/

            expector.objects[obj.$$mockid].should.eql
                object: obj
                functions:
                    called: {}
                    expected: {}
                    original: {}


    context 'mocking and validating', ->

        beforeEach ->

            @obj = func: -> 'original'

            # @error = undefined

            expector.create @obj

            walker.reset @args

            runner.reset()

            _before ->
            _beforeEach ->
            _it 'test1', -> 1
            _after ->
            _afterEach ->

            @step = undefined

            @args.root.children = 
                CHILD_UUID: tree: children: []

            @startStep = (type, fn) =>

                if type == 'beforeAll' then step = dev.tree.hooks.beforeAll[0]
                else if type == 'beforeEach' then step = dev.tree.hooks.beforeEach[0]
                else if type == 'afterEach' then step = dev.tree.hooks.afterEach[0]
                else if type == 'afterAll' then step = dev.tree.hooks.afterAll[0]
                else if type == 'test' then step = dev.tree.children[0]
                @step = step
                step.fn = fn
                step.children = [
                    @child = {children:[]}
                ]
                runStep = runner.createStep {}, type, step, step
                # runStep.node = dev.tree
                runner.runStep @args.root, {}, {}, runStep, (->), ->

        
        it 'does not allow does() or mock() in beforeAll', ->

            @startStep 'beforeAll', => @obj.does()
            @child.cancelled.error.toString().should.match /ConfigurationError\: Can only use does\(\) in test or beforeEach\./

            # @startStep 'beforeAll', => @obj.Does()
            # @child.cancelled.error.toString().should.match /ConfigurationError\: Can only use does\(\) in test or beforeEach\./

            @startStep 'beforeAll', => @obj.mock()
            @child.cancelled.error.toString().should.match /ConfigurationError\: Can only use mock\(\) in test or beforeEach\./

            # @startStep 'beforeAll', => @obj.Mock()
            # @child.cancelled.error.toString().should.match /ConfigurationError\: Can only use mock\(\) in test or beforeEach\./
                
        it 'does not allow does() or mock() in afterAll', ->

            @startStep 'afterAll', => @obj.does()
            @args.root.children.CHILD_UUID.tree.cancelled.error.toString().should.match /ConfigurationError\: Can only use does\(\) in test or beforeEach\./

            # @startStep 'afterAll', => @obj.Does()
            # @args.root.children.CHILD_UUID.tree.cancelled.error.toString().should.match /ConfigurationError\: Can only use does\(\) in test or beforeEach\./

            @startStep 'afterAll', => @obj.mock()
            @args.root.children.CHILD_UUID.tree.cancelled.error.toString().should.match /ConfigurationError\: Can only use mock\(\) in test or beforeEach\./

            # @startStep 'afterAll', => @obj.Mock()
            # @args.root.children.CHILD_UUID.tree.cancelled.error.toString().should.match /ConfigurationError\: Can only use mock\(\) in test or beforeEach\./
                
        it 'does not allow does() or mock() in afterEach', ->

            @startStep 'afterEach', => @obj.does()
            @args.root.children.CHILD_UUID.tree.cancelled.error.toString().should.match /ConfigurationError\: Can only use does\(\) in test or beforeEach\./

            # @startStep 'afterEach', => @obj.Does()
            # @args.root.children.CHILD_UUID.tree.cancelled.error.toString().should.match /ConfigurationError\: Can only use does\(\) in test or beforeEach\./

            @startStep 'afterEach', => @obj.mock()
            @args.root.children.CHILD_UUID.tree.cancelled.error.toString().should.match /ConfigurationError\: Can only use mock\(\) in test or beforeEach\./

            # @startStep 'afterEach', => @obj.Mock()
            # @args.root.children.CHILD_UUID.tree.cancelled.error.toString().should.match /ConfigurationError\: Can only use mock\(\) in test or beforeEach\./
                
        it 'does allow does() or mock() in beforeEach', ->

            @startStep 'beforeEach', => @obj.does()
            should.not.exist @child.cancelled

            # @startStep 'beforeEach', => @obj.Does()
            # should.not.exist @child.cancelled

            @startStep 'beforeEach', => @obj.mock()
            should.not.exist @child.cancelled

            # @startStep 'beforeEach', => @obj.Mock()
            # should.not.exist @child.cancelled

        it 'does allow does() or mock() in test', ->

            @startStep 'test', => @obj.does()
            should.not.exist @child.cancelled

            # @startStep 'test', => @obj.Does()
            # should.not.exist @child.cancelled

            @startStep 'test', => @obj.mock()
            should.not.exist @child.cancelled

            # @startStep 'test', => @obj.Mock()
            # should.not.exist @child.cancelled

        it 'does not allow spy or stub outside test or hook', ->

            try @obj.spy
            catch e
                e.toString().should.match /ConfigurationError: Cannot use spy\(\) out of test or hook\./ 

            # try @obj.Spy
            # catch e
            #     e.toString().should.match /ConfigurationError: Cannot use spy\(\) out of test or hook\./ 

            try @obj.stub
            catch e
                e.toString().should.match /ConfigurationError: Cannot use stub\(\) out of test or hook\./ 

            # try @obj.Stub
            # catch e
            #     e.toString().should.match /ConfigurationError: Cannot use stub\(\) out of test or hook\./ 

        context 'mocker()', ->

            it 'is called with the stubType and the mockid', (done) ->

                expector.mocker = (stubType, id)  =>

                    stubType.should.equal 'does'
                    id.should.equal @obj.$$mockid
                    done()

                @startStep 'test', => @obj.does()


            it 'returns the function that sets up the stubs', (done) ->

                @startStep 'test', =>

                    stubber = expector.mocker 'does', @obj.$$mockid

                    original = @obj.func

                    @obj.func().should.equal 'original'

                    stubber func: -> 'replaced'

                    @obj.func.should.be.an.instanceOf Function

                    @obj.func.toString().should.match /STUBBED_FUNCTION/

                    expector.objects[@obj.$$mockid].object.should.eql @obj
                    functions = expector.objects[@obj.$$mockid].functions

                    functions.expected.func.length.should.equal 1
                    functions.expected.func[0].fn().should.equal 'replaced'
                    functions.called.func.length.should.equal 0
                    functions.original.func.should.equal original


                    @obj.func().should.equal 'replaced'
                    functions.expected.func.length.should.equal 0
                    functions.called.func.length.should.equal 1

                    should.not.exist dev.runStep.step.node.error

                    @obj.func()

                    dev.runStep.step.node.error
                    .toString().should.match /ExpectationError/

                    done()

                1


                    




