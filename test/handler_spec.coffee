require './_fake_objective'

describe 'Main Handler', ->

    dev      = require '../'
    handler  = require '../lib/handler'
    compiler = require '../lib/compiler'
    walker   = require '../lib/tester/walker'
    runner   = require '../lib/tester/runner'

    root = 
        config: uuid: 'YYY'
        children: CHILD_UUID: {}
        home: 'home'
        recursor: -> then: (r) -> r()

    childConfig = 
        uuid: 'CHILD_UUID'

    before (done) -> 

        dev.$$createInstance root, childConfig, done

    beforeEach ->
        walker.reset root: root, config: childConfig
        root.loadChild = -> then: (resolve) -> resolve()

    after -> objective.pipeline.emit = ->

    context 'foundFile()', ->

        it 'is called when the objective recursor finds a file', ->

        it 'ignores non source and test files', ->

            handler.foundFile
                root: root
                path: 'something.else'
                ->
                    dev.roots.YYY.files.should.eql test: {}, source: {}

        it 'adds source and test files to list', ->

            handler.foundFile
                root: root
                path: 'lib/something.js'
                ->          
                    handler.foundFile
                        root: root
                        path: 'test/something.js' # has no _test
                        ->
                            handler.foundFile
                                root: root
                                path: 'test/something_test.js' # has no _test
                                ->
                                    dev.roots.YYY.files.should.eql
                                        source:
                                            'lib/something.js':
                                                type: 'source'
                                                base: 'something'
                                                ext: '.js'
                                                file: 'lib/something.js'
                                        test:
                                            'test/something_test.js':
                                                type: 'test'
                                                base: 'something_test'
                                                ext: '.js'
                                                file: 'test/something_test.js'


    context 'endRecurse()', ->

        it 'is called when the objective recursor completes each directory', ->

        it 'does nothing unless it was the test dir ending', ->

            objective.pipeline.emit = -> throw new Error "Shouldn't"

            handler.endRecurse
                root: root
                path: 'src'
                ->

        it 'runs all accumulated test files if ending recurse of test dir', ->

            dev.roots.YYY.files = 
                test:
                    'test/one_test.js': {}
                    'test/two_test.js': {}
                    'test/three_test.js': {}
                    'test/four_test.js': {}

            loaded = [];

            root.loadChild = (file) -> 

                loaded.push file
                return then: (resolve) -> resolve()

            objective.pipeline.emit = (event, payload, callback) -> 

                return callback null, payload if event == 'objective.multiple.start'
                return callback null, payload if event == 'objective.multiple.end'
                console.log 'unexpected event', event


            handler.endRecurse
                root: root
                path: 'test'
                ->
                    loaded.should.eql [
                        'test/one_test.js'
                        'test/two_test.js'
                        'test/three_test.js'
                        'test/four_test.js'
                    ]



    context 'changeFile()', ->

        it 'is called when a test or source file is changed', ->

        context "when it's a test file", ->

            beforeEach ->

                dev.roots.YYY.files =
                    test:
                        'test/one_test.js': {}

                    source:
                        'lib/one.js':
                            base: 'one'

            it 'warns if another test is currently running', (done) ->

                objective.currentChild = {}

                objective.logger.onWarn = (str, file) ->
                    objective.logger.onWarn = ->
                    str.should.equal 'Ignored %s, buzy.'
                    file.should.equal 'test/one_test.js'
                    done()

                handler.changedFile
                    root: root,
                    path: 'test/one_test.js'
                    ->

            it 'completes the wait() if re-running the waiting testfile', (done) ->

                
                _it 'test', -> _wait()
                test = dev.tree.children[0]
                step = runner.createStep 'info', 'test', test, test.fn

                objective.onWarn = -> console.log arguments
                reject = -> 
                resolve = -> done() # wait resolved

                dev.roots.YYY.config.filename = 'test/one_test.js'

                # start test step that wait()s
                runner.runStep root, dev.roots.YYY.config, {}, step, resolve, reject
                
                handler.changedFile
                    root: root,
                    path: 'test/one_test.js'
                    ->



            it 'runs the test', ->

                delete objective.currentChild

                root.loadChild = (file) ->
                    file.should.equal 'test/one_test.js'
                    then: ->

                handler.changedFile
                    root: root,
                    path: 'test/one_test.js'
                    ->


        context "when it's a source file", ->

            it 'calls the compiler (which may do nothing)', (done) ->

                compiler.compile = -> 
                    compiler.compile = ->
                    done()

                handler.changedFile
                    root: root,
                    path: 'lib/one.js'
                    ->

            it 'calls the corresponding test if present', (done) ->

                tries = []
                fs = require 'fs'
                orig = fs.lstatSync
                fs.lstatSync = (file) -> tries.push file

                root.loadChild = (file) ->
                    file.should.eql 'test/one_test'
                    then: (resolve) -> resolve()

                handler.changedFile
                    root: root,
                    path: 'lib/one.js'
                    ->
                        tries.should.eql ['home/test/one_test.js', 'home/test/one_test.coffee']
                        fs.lstatSync = orig
                        done()


        context "when it's neither test or source", ->

            it 'nothing happens', ->




