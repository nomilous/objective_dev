require '../_fake_objective'

describe 'ExpectationError', ->

    {ExpectationError, HookError} = require '../../lib/errors'

    it 'is an instanceof Error', ->

        e = new ExpectationError
        e.should.be.an.instanceOf Error

    it.only 'is not an instance of HookError', ->

        e = new ExpectationError
        console.log(e instanceof HookError)

    it 'is named', ->

        e = new ExpectationError 'message'
        e.toString().should.match /ExpectationError: message/

    it 'supports additional properties from constructor', ->

        e = new ExpectationError 'message',
            more: 'stuff',
            in: 'here'

        e.more.should.equal 'stuff'
