objective 'SomethingClassy',

    uuid: '04f92eba-3400-401e-befa-ea78ab5dd895'
    description: ''
                        #
                        # Config: What a mission?
                        # 
                        # a) true
                        # b) false
                        # c) NaN
                        # d) undefined is not a function
                        #
                        

.run ->

    # skipping because of context.only() at the end


    before ->

    after -> 

                        #
                        # When injecting with FirstCapitalLetter
                        # modules from lib/ or src/ are injected
                        #    (here eg. src/something_classy.coffee)
                        #           ie. searches by name with sen-
                        #                                         sible
                        #                                         deLimiter
                        #
    beforeEach (SomethingClassy) ->

        # create a mockable instance of Lloyd Blankfein
        #                                (some banker)
        #

        console.log 'beforeEach'

        mock 'lloyd', new SomethingClassy 'Lloyd Blankfein'

        #
        # this mock instance can now be injected into
        # all decendant test nodes
        #
        # AND
        #
        # it has a .does() function to create expectations
        # 
        # specifically function expectations
        # 


    xcontext 'during the day', ->

        it 'eats', (done, lloyd) ->

                            #
                            #
                            # see how lloyd got injected
                            # 


            lloyd.does

                eat: -> 'food'

                # whole: ->

                # bunch: ->


            # having just replaced lloyd's eat method with an
            # expectation that he will eat before the test is
            # out

            setTimeout done, 200

            #
            # this test will fail
            # -------------------
            # 
            # 1. because lloyd eats 20 times a second
            # 2. if eat() was called more than once
            #


        it 'works very hard', (lloyd, should) ->


            lloyd.does

                work: (hard) -> 

                    hard.should.equal true

                    @relax()

                relax: ->

                    throw (
                        e  = new Error 'No rest for the wicked!'
                        e.extraInfo = 'zerozerozeroseroseyrosey'
                        e
                    )


            lloyd.work true

            #
            # this test will fail
            # -------------------
            # 
            # 1. because relax was called
            # 2. and
            # 3. that means lloyd is not working very hard
            #


    context 'during the night', ->

        it 'lets us spy on lloyd sleeping',
        
            (lloyd, should, done) ->

                lloyd.spy

                    sleep: (arg) ->

                        arg.should.equal 'tight'

                            #
                            # this test will not fail
                            # -----------------------
                            # 
                            # 1. because 'tight' is 'tight'
                            # 



                lloyd.sleep 'tight'

                .should.equal 'Goodnight Lloyd Blankfein, sleep tight...'

                done()



    afterEach (lloyd) -> clearTimeout lloyd.eatInterval



    context.only 'lloyd does nothing', ->

