require './_fake_objective'

describe 'Integration Tests', ->

    dev = require '../'
    walker = require '../lib/tester/walker'
    runner = require '../lib/tester/runner'

    before (done) ->

        @origEmit = objective.pipeline.emit

        @root = 
            config: 
                uuid: 'ROOT__UUID'
            children:
                CHILD__UUID: {}
        @config = {}

        dev.create @root, @config, (err) ->

            return done(err) if err?
            done()

    afterEach ->

        objective.pipeline.emit = @origEmit


    beforeEach ->

        @args = 
            root: @root
            config: 
                uuid: 'CHILD__UUID'
            required: {}

        objective.pipeline.emit = (event, args, callback) ->
            return callback(null, args) if event == 'dev.test.before.all'
            return callback(null, args) if event == 'dev.test.before.each'
            return callback(null, args) if event == 'dev.test.after.each'
            return callback(null, args) if event == 'dev.test.after.all'
            console.log event


    context 'sequencing', ->

        it 'runs all hooks and tests in the correct order', (done) ->

            walker.reset @args

            calls = []

            _it                 '', -> calls.push 'outer it 1'
            _after                  -> calls.push 'outer after all 1'
            _before                 -> calls.push 'outer before all 1'
            _beforeEach             -> calls.push 'outer before each 1'
            _before                 -> calls.push 'outer before all 2'
            _afterEach              -> calls.push 'outer after each 1'
            _after                  -> calls.push 'outer after all 2'
            _it                 '', -> calls.push 'outer it 2'
            _it                 '', -> calls.push 'outer it 3'
            _describe           '', ->
                _after              -> calls.push 'inner after all 1'
                _before             -> calls.push 'inner before all 1'
                _beforeEach         -> calls.push 'inner before each 1'
                _before             -> calls.push 'inner before all 2'
                _afterEach          -> calls.push 'inner after each 1'
                _after              -> calls.push 'inner after all 2'
                _it             '', -> calls.push 'inner it 1'
                _it             '', -> calls.push 'inner it 2'
                _it             '', -> calls.push 'inner it 3'
                _context        '', ->
                    _it         '', -> calls.push 'deeper1 it 1'
                    _after          -> calls.push 'deeper1 after all 1'
                    _before         -> calls.push 'deeper1 before all 1'
                    _beforeEach     -> calls.push 'deeper1 before each 1'
                    _before         -> calls.push 'deeper1 before all 2'
                    _afterEach      -> calls.push 'deeper1 after each 1'
                    _after          -> calls.push 'deeper1 after all 2'
                    _it         '', -> calls.push 'deeper1 it 2'
                    _it         '', -> calls.push 'deeper1 it 3'
                _context        '', ->
                    _it         '', -> calls.push 'deeper2 it 1'
                    _it         '', -> calls.push 'deeper2 it 1'
                _it             '', -> calls.push 'inner it 4'


            calls.should.eql []

            objective.promised.then ->

                calls.should.eql [
                    'outer before all 1',
                    'outer before all 2',
                    'outer before each 1',
                    'outer it 1',
                    'outer after each 1',
                    'outer before each 1',
                    'outer it 2',
                    'outer after each 1',
                    'outer before each 1',
                    'outer it 3',
                    'outer after each 1',
                    'outer before each 1',
                    'inner before all 1',
                    'inner before all 2',
                    'inner before each 1',
                    'inner it 1',
                    'inner after each 1',
                    'outer after each 1',
                    'outer before each 1',
                    'inner before each 1',
                    'inner it 2',
                    'inner after each 1',
                    'outer after each 1',
                    'outer before each 1',
                    'inner before each 1',
                    'inner it 3',
                    'inner after each 1',
                    'outer after each 1',
                    'outer before each 1',
                    'inner before each 1',
                    'deeper1 before all 1',
                    'deeper1 before all 2',
                    'deeper1 before each 1',
                    'deeper1 it 1',
                    'deeper1 after each 1',
                    'inner after each 1',
                    'outer after each 1',
                    'outer before each 1',
                    'inner before each 1',
                    'deeper1 before each 1',
                    'deeper1 it 2',
                    'deeper1 after each 1',
                    'inner after each 1',
                    'outer after each 1',
                    'outer before each 1',
                    'inner before each 1',
                    'deeper1 before each 1',
                    'deeper1 it 3',
                    'deeper1 after each 1',
                    'deeper1 after all 1',
                    'deeper1 after all 2',
                    'inner after each 1',
                    'outer after each 1',
                    'outer before each 1',
                    'inner before each 1',
                    'deeper2 it 1',
                    'inner after each 1',
                    'outer after each 1',
                    'outer before each 1',
                    'inner before each 1',
                    'deeper2 it 1',
                    'inner after each 1',
                    'outer after each 1',
                    'outer before each 1',
                    'inner before each 1',
                    'inner it 4',
                    'inner after each 1',
                    'inner after all 1',
                    'inner after all 2',
                    'outer after each 1',
                    'outer after all 1',
                    'outer after all 2' 
                ]
                done()

            objective.promised.start()


        it 'does not run tests in pended context', (done) ->

            walker.reset @args

            calls = []

            _it                 '', -> calls.push 'outer it 1'
            _after                  -> calls.push 'outer after all 1'
            _before                 -> calls.push 'outer before all 1'
            _beforeEach             -> calls.push 'outer before each 1'
            _before                 -> calls.push 'outer before all 2'
            _afterEach              -> calls.push 'outer after each 1'
            _after                  -> calls.push 'outer after all 2'
            _it                 '', -> calls.push 'outer it 2'
            _it                 '', -> calls.push 'outer it 3'

            _xdescribe '', -> ##############################
                _after              -> calls.push 'inner after all 1'
                _before             -> calls.push 'inner before all 1'
                _beforeEach         -> calls.push 'inner before each 1'
                _before             -> calls.push 'inner before all 2'
                _afterEach          -> calls.push 'inner after each 1'
                _after              -> calls.push 'inner after all 2'
                _it             '', -> calls.push 'inner it 1'
                _it             '', -> calls.push 'inner it 2'
                _it             '', -> calls.push 'inner it 3'
                _context        '', ->
                    _it         '', -> calls.push 'deeper1 it 1'
                    _after          -> calls.push 'deeper1 after all 1'
                    _before         -> calls.push 'deeper1 before all 1'
                    _beforeEach     -> calls.push 'deeper1 before each 1'
                    _before         -> calls.push 'deeper1 before all 2'
                    _afterEach      -> calls.push 'deeper1 after each 1'
                    _after          -> calls.push 'deeper1 after all 2'
                    _it         '', -> calls.push 'deeper1 it 2'
                    _it         '', -> calls.push 'deeper1 it 3'
                _context        '', ->
                    _it         '', -> calls.push 'deeper2 it 1'
                    _it         '', -> calls.push 'deeper2 it 1'
                _it             '', -> calls.push 'inner it 4'


            calls.should.eql []

            objective.promised.then ->

                calls.should.eql [
                    'outer before all 1',
                    'outer before all 2',
                    'outer before each 1',
                    'outer it 1',
                    'outer after each 1',
                    'outer before each 1',
                    'outer it 2',
                    'outer after each 1',
                    'outer before each 1',
                    'outer it 3',
                    'outer after each 1',
                    'outer after all 1',
                    'outer after all 2'
                ]
                done()

            objective.promised.start()


        it 'only runs tests in only"d context', (done) ->

            walker.reset @args

            calls = []

            _it                 '', -> calls.push 'outer it 1'
            _after                  -> calls.push 'outer after all 1'
            _before                 -> calls.push 'outer before all 1'
            _beforeEach             -> calls.push 'outer before each 1'
            _before                 -> calls.push 'outer before all 2'
            _afterEach              -> calls.push 'outer after each 1'
            _after                  -> calls.push 'outer after all 2'
            _it                 '', -> calls.push 'outer it 2'
            _it                 '', -> calls.push 'outer it 3'
            _describe           '', -> 
                _after              -> calls.push 'inner after all 1'
                _before             -> calls.push 'inner before all 1'
                _beforeEach         -> calls.push 'inner before each 1'
                _before             -> calls.push 'inner before all 2'
                _afterEach          -> calls.push 'inner after each 1'
                _after              -> calls.push 'inner after all 2'
                _it             '', -> calls.push 'inner it 1'
                _it             '', -> calls.push 'inner it 2'
                _it             '', -> calls.push 'inner it 3'

                _context.only '', -> #############################
                    _it         '', -> calls.push 'deeper1 it 1'
                    _after          -> calls.push 'deeper1 after all 1'
                    _before         -> calls.push 'deeper1 before all 1'
                    _beforeEach     -> calls.push 'deeper1 before each 1'
                    _before         -> calls.push 'deeper1 before all 2'
                    _afterEach      -> calls.push 'deeper1 after each 1'
                    _after          -> calls.push 'deeper1 after all 2'
                    _it         '', -> calls.push 'deeper1 it 2'
                    _it         '', -> calls.push 'deeper1 it 3'
                _context        '', ->
                    _it         '', -> calls.push 'deeper2 it 1'
                    _it         '', -> calls.push 'deeper2 it 1'
                _it             '', -> calls.push 'inner it 4'


            calls.should.eql []

            objective.promised.then ->

                calls.should.eql [ 
                    'outer before all 1',
                    'outer before all 2',
                    'outer before each 1',
                    'inner before all 2',
                    'inner before all 1',
                    'inner before each 1',
                    'deeper1 before all 1',
                    'deeper1 before all 2',
                    'deeper1 before each 1',
                    'deeper1 it 1',
                    'deeper1 after each 1',
                    'inner after each 1',
                    'outer after each 1',
                    'outer before each 1',
                    'inner before each 1',
                    'deeper1 before each 1',
                    'deeper1 it 2',
                    'deeper1 after each 1',
                    'inner after each 1',
                    'outer after each 1',
                    'outer before each 1',
                    'inner before each 1',
                    'deeper1 before each 1',
                    'deeper1 it 3',
                    'deeper1 after each 1',
                    'deeper1 after all 1',
                    'deeper1 after all 2',
                    'inner after each 1',
                    'inner after all 1',
                    'inner after all 2',
                    'outer after each 1'
                    'outer after all 1',
                    'outer after all 2'

                ]
                done()

            objective.promised.start()

                   



