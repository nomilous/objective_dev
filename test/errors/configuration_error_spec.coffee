require '../_fake_objective'

describe 'ConfigurationError', ->

    {ConfigurationError} = require '../../lib/errors'

    it 'is an instanceof Error', ->

        e = new ConfigurationError
        e.should.be.an.instanceOf Error

    it 'is named', ->

        e = new ConfigurationError 'message'
        e.toString().should.match /ConfigurationError: message/


    it 'supports additional properties from constructor', ->

        e = new ConfigurationError 'message',
            more: 'stuff',
            in: 'here'

        e.more.should.equal 'stuff'
