require './_fake_objective'

describe 'Module Root', ->

    dev = require '../'

    it 'defines testing tools on global', ->

        _mock      .should.be.an.instanceOf Function
        _wait      .should.be.an.instanceOf Function
        _flush      .should.be.an.instanceOf Function
        _it      .should.be.an.instanceOf Function
        _it.only      .should.be.an.instanceOf Function
        _xit      .should.be.an.instanceOf Function
        _before      .should.be.an.instanceOf Function
        _beforeEach      .should.be.an.instanceOf Function
        _beforeAll      .should.be.an.instanceOf Function
        _beforeEach      .should.be.an.instanceOf Function
        _beforeEach      .should.be.an.instanceOf Function
        _beforeEach      .should.be.an.instanceOf Function
        _context      .should.be.an.instanceOf Function
        _describe      .should.be.an.instanceOf Function
        _context.only      .should.be.an.instanceOf Function
        _describe.only      .should.be.an.instanceOf Function
        _xdescribe      .should.be.an.instanceOf Function
        _xcontext      .should.be.an.instanceOf Function
        _after      .should.be.an.instanceOf Function
        _afterEach      .should.be.an.instanceOf Function
        _afterAll      .should.be.an.instanceOf Function
        _xbefore      .should.be.an.instanceOf Function
        _xbeforeEach      .should.be.an.instanceOf Function
        _xbeforeAll      .should.be.an.instanceOf Function
        _xafter      .should.be.an.instanceOf Function
        _xafterEach      .should.be.an.instanceOf Function
        _xafterAll      .should.be.an.instanceOf Function

    it 'defines create() to configure a new testing instance', (done) ->

        root = 
            config:
                uuid: 'XXX'

        config = {}

        dev.create root, config, (err) ->

            return done (err) if err?

            dev.roots.XXX.config.should.eql

                testDir: 'test'
                testAppend: '_test'
                sourceDir: 'lib'
                reporter: 'Default'
                runAll: false
                fullTrace: false
                filterTrace: false

            done()

