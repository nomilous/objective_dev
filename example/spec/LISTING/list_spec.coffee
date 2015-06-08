objective ->

    try

        mock()  # make mockable
        wait()  # & see.* with repl
        flush() # flushes require cache and mocks back to test starting state

        it()
        it.only() # runs only this it (and others with .only)
        xit() # skip this it

        before() # (beforeAll) - also supports {each:fn,all:fn}
        beforeEach()
        beforeAll() # same as before
        beforeEach() # can
        beforeEach() # repeat
        beforeEach() # hooks (they'l'l run in sequence)

        context()
        describe()
        context.only() # runs only context (and other tests with only)
        describe.only()
        xdescribe()
        xcontext()

        after() # (afterAll) - also supports {each:fn,all:fn}
        afterEach()
        afterAll() # same as after

        xbefore()
        xbeforeEach()
        xbeforeAll()
        xafter()
        xafterEach()
        xafterAll()
