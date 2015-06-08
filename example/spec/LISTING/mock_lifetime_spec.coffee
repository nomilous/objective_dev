objective (should) ->

    # mock not allowed out of hook or test
    # mock 'thing', {}

    before -> mock 'stuff', fn: -> 1


    context 'create mock inside here', ->


        before -> mock 'thing', fn: -> 2


        context 'deeper 1', ->

            it 'thing is here', (thing) ->

                thing.fn().should.equal 2


        it 'thing is here too', (thing) ->

            thing.fn().should.equal 2



    xit 'thing is NOT here', (thing) ->

        console.log thing

    it 'but stuff is', (stuff) ->

        stuff.fn().should.equal 1


    # pointless, but allowed

    after -> mock 'thing'
