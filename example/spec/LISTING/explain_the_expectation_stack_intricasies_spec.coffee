objective 'Explain the "expection stack" intricasies', (should) ->

    class Thing

        method: -> 'original'

    before ->

        # - Create mockable instance of thing for injection into tests

        mock 'alias', new Thing


    it 'has the origin method', (alias) -> 

        alias.method().should.equal 'original'


    # context 'no. cannot inject mocks into context', (alias) ->


    context 'outer context', ->

        before (alias) ->

            # - No. cannot create expectations in beforeEach and tests

            # alias.does method: ->

            # - Stubs and spies are allowed in beforeAll hooks
            # - They remain in place for the entire context they were created in.
            # - They behave exacly as if set in a before each, but are only set once
            # 
            #                                                  

            alias.stub method: -> 'first stub' #1


        it 'has the stub', (alias) -> 

            alias.method().should.equal 'first stub'


        context 'inner context', ->

            beforeEach (alias) ->

                alias.does method: -> 'expectation' #2

                # - Expectation is now overlaying stub
                # - Tests will fail if method() is not called

            it 'passes', (alias) ->

                alias.method().should.equal 'expectation'

            it 'fails', (alias) ->

                # - Too few calls to method()

            it 'fails', (alias) ->

                # - Too many calls to method()

                alias.method().should.equal 'expectation'
                alias.method().should.equal 'expectation'


            context 'inner sanctum', ->

                before (alias) -> 

                    alias.stub method:-> 'second stub'

                    # - Stub has overwritten the expectation so tests in
                    #   this context will not fail as above.


                it 'does not fail', (alias) ->

                    alias.method().should.equal 'second stub'
                    alias.method().should.equal 'second stub'
                    alias.method().should.equal 'second stub'
                    alias.method().should.equal 'second stub'
                    alias.method().should.equal 'second stub'
                    alias.method().should.equal 'second stub'


                it 'does not fail', (alias) ->

                    alias.method().should.equal 'second stub'
                    alias.method().should.equal 'second stub'


            it 'still fails here tho', (alias) ->

                # - Expectation #2 is back in play
                # alias.method().should.equal 'expectation'


        it 'does not fail here', (alias) ->

            # - Expectation #2 is gone.
            # - Stub #1 is back in play even tho it was created in a beforeAll and set only once

            alias.method().should.equal 'first stub'
            alias.method().should.equal 'first stub'
            alias.method().should.equal 'first stub'


    it 'stub is gone, outer context only has original', (alias) ->

        alias.method().should.equal 'original'
        alias.method().should.equal 'original'
        alias.method().should.equal 'original'

