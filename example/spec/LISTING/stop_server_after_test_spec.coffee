objective 'Stop server after test', (should) ->

    after (server, done) -> server.close done

    before (http, express, done) ->

        mock('moo', fn: -> 1)
        .stub fn: -> 2

        http.stub createServer: (app) ->

            # replacing http.createServer()
            # ,, but still call the original function to create the server

            server = mock.original.apply null, arguments

            # alias it for injection into other hooks and tests

            mock 'server', server

            mock 'app', app

            done()

            return server


        #
        # replace with call that would normally start the server
        #
        app = express()
        app.listen(3000);
        # require('../my_server')




    it 'server and app', (server, app, moo) ->

        moo.fn().should.equal 2



    it 'server and app', (server, app, moo) ->

        moo.fn().should.equal 2




