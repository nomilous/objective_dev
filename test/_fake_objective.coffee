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



global.ObjectiveError = ->

    frames = undefined
    e = Error.apply(this, arguments);

    Object.defineProperty this, 'name',    value: 'Error', configurable: true
    Object.defineProperty this, 'message', value: e.message, configurable: true
    Object.defineProperty this, 'frames',  (get: -> return frames), configurable: true
    Object.defineProperty this, 'stack',   (get: -> return e.stack), configurable: true

    origPrepareStackTrace = Error.prepareStackTrace
    Error.prepareStackTrace = (e, stack) -> return stack
    try
      frames = Error.apply(this, arguments).stack.map (frame) ->
        return {
          native: frame.isNative()
          file: frame.getFileName()
          line: frame.getLineNumber()
          colm: frame.getColumnNumber()
          fn: frame.getFunction()
          frame: frame
        }
      frames.shift();
      frames.shift(); 
                    
    finally 
      Error.prepareStackTrace = origPrepareStackTrace;

    return this


    ObjectiveError.prototype = Error.prototype
    ObjectiveError.prototype.constructor = ObjectiveError


