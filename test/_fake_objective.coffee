global.objective = 

    logger:

        TODO: ->

        warn: ->

            try global.objective.logger.onWarn.apply null, arguments

        error: ->

            try global.objective.logger.onError.apply null, arguments

        createDebug: -> ->

    coffee: 

        compile: -> return 'compiled'

    pipeline:

        createEvent: ->

        on: ->