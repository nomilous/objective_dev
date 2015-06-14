require './_fake_objective'

describe 'Module Root', ->

    dev = require '../'

    it 'defines testing tools on global', ->

        test_mock      .should.be.an.instanceOf Function
        test_wait      .should.be.an.instanceOf Function
        test_flush      .should.be.an.instanceOf Function
        test_it      .should.be.an.instanceOf Function
        test_it.only      .should.be.an.instanceOf Function
        test_xit      .should.be.an.instanceOf Function
        test_before      .should.be.an.instanceOf Function
        test_beforeEach      .should.be.an.instanceOf Function
        test_beforeAll      .should.be.an.instanceOf Function
        test_beforeEach      .should.be.an.instanceOf Function
        test_beforeEach      .should.be.an.instanceOf Function
        test_beforeEach      .should.be.an.instanceOf Function
        test_context      .should.be.an.instanceOf Function
        test_describe      .should.be.an.instanceOf Function
        test_context.only      .should.be.an.instanceOf Function
        test_describe.only      .should.be.an.instanceOf Function
        test_xdescribe      .should.be.an.instanceOf Function
        test_xcontext      .should.be.an.instanceOf Function
        test_after      .should.be.an.instanceOf Function
        test_afterEach      .should.be.an.instanceOf Function
        test_afterAll      .should.be.an.instanceOf Function
        test_xbefore      .should.be.an.instanceOf Function
        test_xbeforeEach      .should.be.an.instanceOf Function
        test_xbeforeAll      .should.be.an.instanceOf Function
        test_xafter      .should.be.an.instanceOf Function
        test_xafterEach      .should.be.an.instanceOf Function
        test_xafterAll      .should.be.an.instanceOf Function

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

            done()

