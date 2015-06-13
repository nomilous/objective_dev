objective 'Explaining', ->

    class Impaler

        charityWork: -> 'no way!'


    before -> mock 'vlad', new Impaler()        # same instance for all tests

    # beforeEach -> mock 'vlad', new Impaler()  # new instance for each test

    it 'shows original function', (vlad) ->

        vlad.charityWork().should.equal 'no way!'

    it 'explains expectation', (vlad) ->

        vlad.does charityWork: -> 'serve soup'

        # this test fails because charityWork() is never called

    it 'explain expectation stack sequence', (vlad) ->

        vlad.does charityWork: -> 'serve soup'
        vlad.does charityWork: -> 'tend crops'
        vlad.does charityWork: -> 'mend fences'

        # expectations are run in the sequence they were created.

        vlad.charityWork().should.equal 'serve soup'
        vlad.charityWork().should.equal 'tend crops'
        vlad.charityWork().should.equal 'mend fences'
        # vlad.charityWork() # fail, called too many times.

    it 'explains the effect of stub', (vlad) ->

        vlad.does charityWork: -> 'serve soup'
        vlad.does charityWork: -> 'tend crops'
        vlad.stub charityWork: ->
        vlad.does charityWork: -> 'mend fences'

        # stub invalidates preceding expectations

        vlad.charityWork().should.equal 'mend fences'
        # vlad.charityWork() # fail, called too many times.

    it 'explains stub after expectations', (vlad) ->

        vlad.does charityWork: -> 'serve soup'
        vlad.does charityWork: -> 'tend crops'
        vlad.does charityWork: -> 'mend fences'
        vlad.stub charityWork: -> 'HAVE TANTRUM'

        # stub is last, all preceding expectations are invalidated

        vlad.charityWork().should.equal 'HAVE TANTRUM'
        vlad.charityWork().should.equal 'HAVE TANTRUM'
        vlad.charityWork().should.equal 'HAVE TANTRUM'
        vlad.charityWork().should.equal 'HAVE TANTRUM'

        # no limit to calls (same as stub by itself)

    it 'explains the effect of spy', (vlad) ->

        vlad.spy charityWork: -> console.log 'in spy 1', arguments
        vlad.spy charityWork: -> console.log 'in spy 2', arguments

        # spy observes, original function is still called

        vlad.charityWork('arg', 'uments').should.equal 'no way!'

        #
        # outputs:
        # in spy 1 { '0': 'arg', '1': 'uments' }
        # in spy 2 { '0': 'arg', '1': 'uments' }
        #

    it 'explains the effect of spy mixed with expectations', (vlad) ->

        vlad.spy charityWork: -> console.log 'in spy 1', arguments
        vlad.spy charityWork: -> console.log 'in spy 2', arguments
        vlad.does charityWork: -> 'serve soup'
        vlad.spy charityWork: -> console.log 'in spy 3', arguments

        vlad.charityWork('arg', 'uments').should.equal 'serve soup'
        
        #
        # outputs:
        # in spy 1 { '0': 'arg', '1': 'uments' }
        # in spy 2 { '0': 'arg', '1': 'uments' }
        # in spy 3 { '0': 'arg', '1': 'uments' }
        # 

        # vlad.charityWork() # fail, called too many times.

        # spies are not run on the second call

    it 'explains spies mixed with stub and expectation', (vlad) ->

        vlad.spy charityWork: -> console.log 'in spy 1', arguments
        vlad.spy charityWork: -> console.log 'in spy 2', arguments
        vlad.does charityWork: -> 'serve soup'
        vlad.stub charityWork: -> 'IMPALE SOMEBODY'
        vlad.spy charityWork: -> console.log 'in spy 3', arguments

        vlad.charityWork('arg', 'uments').should.equal 'IMPALE SOMEBODY'
        vlad.charityWork('arg', 'uments').should.equal 'IMPALE SOMEBODY'
        vlad.charityWork('arg', 'uments').should.equal 'IMPALE SOMEBODY'
        vlad.charityWork('arg', 'uments').should.equal 'IMPALE SOMEBODY'

        # the stub has invalidated the preceding expectation and spies

        #
        # outputs:
        # in spy 3 { '0': 'arg', '1': 'uments' }
        # in spy 3 { '0': 'arg', '1': 'uments' }
        # in spy 3 { '0': 'arg', '1': 'uments' }
        # in spy 3 { '0': 'arg', '1': 'uments' }
        #
