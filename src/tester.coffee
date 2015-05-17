global.context = (descr, callback) ->

    console.log "context '#{descr}' not implemented"

    callback() if callback?

global.it = (descr, callback) ->

    console.log "it '#{descr}' not implemented"

    callback() if callback?
