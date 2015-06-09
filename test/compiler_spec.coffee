require './_fake_objective'

describe 'Compiler', ->

    compiler = require '../lib/compiler'

    root = 
        config: compileTo: 'lib'
        root: home: 'home'

    detail = 
        base: 'one'
        ext: '.coffee'
        file: 'src/one.coffee'

    mkpath = require 'mkpath'

    it 'does nothing if compileTo is unconfigured', ->

    it 'creates the compileTo directory if compileTo and not present', (done) ->

        objective.logger.onWarn = -> #console.log arguments

        mkpath.sync = (path) ->

            path.should.equal 'home/lib'
            done()
            throw 'stop here'

        compiler.compile root, detail, createDir: true


    it 'compiles', (done) ->

        mkpath.sync = ->

        fs = require 'fs'

        orig1 = fs.readFileSync
        orig2 = fs.writeFileSync

        fs.readFileSync = (file) ->
            fs.readFileSync = orig1
            file.should.equal 'home/src/one.coffee'
            "fake content"

        fs.writeFileSync = (file, content) ->
            fs.writeFileSync = orig2
            file.should.equal 'home/lib/one.js'
            content.should.equal 'compiled'
            done()

        compiler.compile root, detail, createDir: true
