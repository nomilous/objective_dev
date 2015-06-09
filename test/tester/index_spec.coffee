require '../_fake_objective'

describe 'Tester Main', ->

    tester = require '../../lib/tester'

    walker = require '../../lib/tester/walker'

    it 'resets the walker on starting', (done) ->

        orig = walker.reset
        walker.reset = ->
            walker.reset = orig
            done()
        tester.onStarting {}, ->
