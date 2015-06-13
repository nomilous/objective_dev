express = require 'express' # will not be flushed (outside objective)

objective 'Explain what flush() does', ->

    dependancy = require 'dependancy' # will be flushed,

    required = ''

    before (fs) ->

        #
        # mocks created in beforeAll hooks (here fs) are not flushed.
        # and fs would not be flushed anyway, it's used by the objective runner. 
        #

        fs.spy 

            readFileSync: (filename) -> 

                required = filename.replace process.cwd() + require('path').sep, ''
                # console.log readFile: required


    it 'flushes all node modules required within this objective (test suite)', ->

        flush(true)

        required.should.equal ''

        require 'dependancy'

        required.should.equal 'node_modules/dependancy/lib/dependancy.js'


    it 'can suppress the flush warnings', ->

        flush(true)

