require '../_fake_objective'

describe 'Tester Injector', ->

    dev = require '../../'
    injector = require '../../lib/tester/injector'
    # runner = require '../../lib/tester/runner'
    walker = require '../../lib/tester/walker'
    fs = require 'fs'
    # promise = require('when').promise
    # should = require 'should'

    before (done) ->
        delete injector.mocks[key] for key in injector.mocks
        @root = 
            config: 
                uuid: 'XYZ'
            home: 'home'
        @config = title: 'title'
        @findLocalModule = injector.findLocalModule
        @lstatSync = fs.lstatSync

        dev.create @root, @config, done

    after ->
        injector.findLocalModule = @findLocalModule
        fs.lstatSync = @lstatSync
        delete injector.mocks[key] for key in injector.mocks

    beforeEach ->

        injector.findLocalModule = @findLocalModule
        fs.lstatSync = @lstatSync

        walker.reset
            root: @root
            config: @config

    context 'on events', ->

        it 'todo'

    context 'mock()', ->

        it 'creates mocks', (done) ->

            test_context '', ->

                injector.mock 'name1', ob: 'ject'

                injector.mocks.name1.object.$$mockname.should.equal 'name1'
                injector.mocks.name1.object.should.eql ob: 'ject'
                done()

            1 # stop the promise returning from test_context


    context 'injecting mocks', ->

        it 'injects mocks if defined', (done) ->

            test_context '', ->

                injector.mock 'name2', ob: 'ject'
                injector.mock 'AnotherName', ob: 'ject2'

                test_context '', (name2, AnotherName) ->

                    name2.should.eql ob: 'ject'
                    AnotherName.should.eql ob: 'ject2'
                    done()

            1

    context 'injecting node modules', ->


    context 'injecting local modules', ->

        it 'injects local if module starts with Upper and is not a mock', (done) ->

            injector.findLocalModule = (root, config, devconfig, libDir, argName) ->
                argName.should.equal 'AlsoThis'
                done()

            test_context '', ->

                injector.mock 'name3', ob: 'ject'
                injector.mock 'AnotherName2', ob: 'ject2'

                try test_context '', (name3, AnotherName2, AlsoThis) ->

            1

        it 'searches libDir for possible matches using original name', ->

            fs.readdirSync = (path) ->

                if path == 'home/lib' then return ['dir1', 'dir2']
                else if path == 'home/lib/dir1' then return ['file1.js', 'file2.js']
                else if path == 'home/lib/dir2' then return ['MyModule.js', 'file4.js']
                else return []

            fs.lstatSync = (path) ->

                if path == 'home/lib/dir1' then return isDirectory: -> true
                else if path == 'home/lib/dir2' then return isDirectory: -> true
                else return isDirectory: -> false
                

            try test_context '', (MyModule) ->
            catch e 
                e.toString().should.match /Cannot find module 'home\/lib\/dir2\/MyModule.js'/
            
            1

        it 'searches libDir for possible matches using lcamel name', ->

            fs.readdirSync = (path) ->

                if path == 'home/lib' then return ['dir1', 'dir2']
                else if path == 'home/lib/dir1' then return ['file1.js', 'file2.js']
                else if path == 'home/lib/dir2' then return ['myModule.js', 'file4.js']
                else return []

            fs.lstatSync = (path) ->

                if path == 'home/lib/dir1' then return isDirectory: -> true
                else if path == 'home/lib/dir2' then return isDirectory: -> true
                else return isDirectory: -> false
                

            try test_context '', (MyModule) ->
            catch e 
                e.toString().should.match /Cannot find module 'home\/lib\/dir2\/myModule.js'/
            
            1

        it 'searches libDir for possible matches using dash name', ->

            fs.readdirSync = (path) ->

                if path == 'home/lib' then return ['dir1', 'dir2']
                else if path == 'home/lib/dir1' then return ['file1.js', 'file2.js']
                else if path == 'home/lib/dir2' then return ['my-module.js', 'file4.js']
                else return []

            fs.lstatSync = (path) ->

                if path == 'home/lib/dir1' then return isDirectory: -> true
                else if path == 'home/lib/dir2' then return isDirectory: -> true
                else return isDirectory: -> false
                

            try test_context '', (MyModule) ->
            catch e 
                e.toString().should.match /Cannot find module 'home\/lib\/dir2\/my-module.js'/
            
            1

        it 'searches libDir for possible matches using underscore name', ->

            fs.readdirSync = (path) ->

                if path == 'home/lib' then return ['dir1', 'dir2']
                else if path == 'home/lib/dir1' then return ['file1.js', 'file2.js']
                else if path == 'home/lib/dir2' then return ['my_module.js', 'file4.js']
                else return []

            fs.lstatSync = (path) ->

                if path == 'home/lib/dir1' then return isDirectory: -> true
                else if path == 'home/lib/dir2' then return isDirectory: -> true
                else return isDirectory: -> false
                

            try test_context '', (MyModule) ->
            catch e 
                e.toString().should.match /Cannot find module 'home\/lib\/dir2\/my_module.js'/
            
            1

        it 'resolves collisions according to test path', ->

            fs.readdirSync = (path) ->

                if path == 'home/lib' then return ['routes', 'dir2']
                else if path == 'home/lib/routes' then return ['file1.js', 'my-module.js']
                else if path == 'home/lib/dir2' then return ['my_module.js', 'file4.js']
                else return []

            fs.lstatSync = (path) ->

                if path == 'home/lib/routes' then return isDirectory: -> true
                else if path == 'home/lib/dir2' then return isDirectory: -> true
                else return isDirectory: -> false
            
            @config.filename = 'test/routes/my-module-test.js'  

            try test_context '', (MyModule) ->
            catch e
                e.toString().should.match /Cannot find module 'home\/lib\/routes\/my-module.js'/
            
            1


        it 'matches DirName for index.js', ->

            fs.readdirSync = (path) ->

                if path == 'home/lib' then return ['my-routes', 'dir2']
                else if path == 'home/lib/my-routes' then return ['file1.js', 'my-module.js', 'index.js']
                else if path == 'home/lib/dir2' then return ['my_module.js', 'file4.js', 'my_routes']
                else if path == 'home/lib/dir2/my_routes' then return ['index.js']          # second match                                
                else return []

            fs.lstatSync = (path) ->

                if path == 'home/lib/my-routes' then return isDirectory: -> true
                else if path == 'home/lib/dir2' then return isDirectory: -> true
                else if path == 'home/lib/dir2/my_routes' then return isDirectory: -> true
                else return isDirectory: -> false
            
            @config.filename = 'test/my-routes/some_test.js'

            try test_context '', (MyRoutes) ->
            catch e
                e.toString().should.match /Cannot find module 'home\/lib\/my-routes\/index.js'/
            
            1









