describe 'ExpectationError', ->

    {ExpectationError} = require '../../lib/errors'

    it 'is an instanceof Error', ->

        e = new ExpectationError
        e.should.be.an.instanceOf Error

    it 'is named', ->

        e = new ExpectationError 'message'
        e.toString().should.match /ExpectationError: message/

    it 'supports additional properties from constructor', ->

        e = new ExpectationError 'message',
            more: 'stuff',
            in: 'here'

        e.more.should.equal 'stuff'
