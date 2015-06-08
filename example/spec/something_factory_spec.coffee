objective 'SomethingFactory'

    # # uuid: '729ccb54-2ed1-4b69-a34e-3730e4cc8b8f'
    # description: ''
    # private: false
    # plugins: ['objective-dev']

.run ->

    it 'creates a default name', (SomethingFactory, should) ->

        # console.log mock('one', t = {a:1});
        # console.log x: mock('three', []);
        thing = SomethingFactory.create()

        thing.name.should.equal 'untitled 1'

    #     require('http').spy = ->

    #     mock 'thing', 

    #         fn1: -> 1

    #         fn2: -> 2

    #     @test = spy: ->

    #     #mock 'moo', @test


    # it 'passes', -> 1

    # it 'passes', -> 2

    # context 'context', ->

    #     it 'fails', (should) ->

    #         2.should.equal 2

    # it 'pends', ->


    # xit 'another fails', (should) ->

    #     2.should.equal 2

    # it 'more fails', (thing, http) ->

    #     thing.stub 

    #         fn1: -> 

    #             #console.log original.toString()

    #             return '2'


    #     # console.log thing

    #     # thing.does 

    #     #     # spy: fn2: -> console.log arguments

    #     #     # stub: fn1: -> console.log 'ad'



    #     thing.fn1(1)    # .should.equal 1

    #     # thing.fn2('x').should.equal 2

