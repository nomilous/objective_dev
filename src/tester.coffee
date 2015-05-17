

global.before = (fn) ->

global.beforeEach = (fn) ->

global.afterEach = (fn) ->

global.afterAll = (fn) ->

global.context = (descr, fn) ->

    console.log caller: caller()

    console.log "context '#{descr}' not implemented"

    fn() if fn?

    return 'moo'

global.describe = global.context

global.it = (descr, fn) ->

    console.log "it '#{descr}' not implemented"

    fn() if fn?

