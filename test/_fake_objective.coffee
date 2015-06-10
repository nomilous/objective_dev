global.objective = 

    logger:

        TODO: ->

        info: ->

            try global.objective.logger.onInfo.apply null, arguments

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

    getCaller: -> file: '', line: '', col: ''

    argsOf: (fn) ->
        fn.toString().match(/function\s*\((.*)\)/)[1]
        .replace(/\s/g, '').split(',').filter (arg) ->
            if arg != '' then return true;
