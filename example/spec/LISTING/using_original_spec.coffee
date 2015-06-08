objective ->

    xit 'allows calling original function from within mock function', (fs) ->

        # stub everything on fs

        Object.keys(fs).forEach (funcName) ->

            return if typeof fs[funcName] != 'function'

            # fs.spy "#{funcName}": ->
            #     console.log funcName, arguments



            # stub that calls the original function (same as spy)

            fs.stub "#{funcName}": ->

                # console.log ooo: original

                console.log funcName, arguments

                mock.original.apply null, arguments




        # watch the search for a non-existant module

        try require('non-existant-module')

