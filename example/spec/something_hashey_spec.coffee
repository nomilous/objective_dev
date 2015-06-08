objective ->

    # #
    # # Objective can be passed as an anonymous funtion
    # # without config or title.
    # # 
    # #         Silly not to title it tho...
    # # 
    # #   eg.
    # #         objective 'Make Fluffy Cloud Float Slowly North', ->
    # #        
    # # 
    # #
    # # Injection also works at the root, but only for
    # # node modules and [objective globals].
    # # 
    # # And it does not attach the mocker (.does())
    # #
    # #   eg.
    # #         objective (cloud) ->
    # #         
    # #              # do some stuff with cloud
    # #

    # # throw new Error('E');



    it 'passes', -> 

        require 'ipso'
        flush(true) # throw new Error ''
