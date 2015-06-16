objective 'Example Dev',
    
    codename: 'shortname'
    uuid: '37e72020-a8ce-45cd-b8af-fd97eed3771e'
    description: ''
    repl: listen: '/tmp/socket-37e72020-a8ce-45cd-b8af-fd97eed3771e'
    plugins:
        'objective-dev':      # {}
            sourceDir: 'src'  # non defaults.
            compileTo: 'lib'
            testDir: 'spec'
            testAppend: '_spec'
            runAll: true
            fullTrace: false
            filterTrace: true
            # reporter: 'Dot'
            reporters:
                # Default: {}
                Dot: {}
            #     another:
            #         with: 'config'


.run (link, recurse, prompt) ->

    # A promise chain initializes the dev runtime.
    # --------------------------------------------

    #
    # Also working on a dependancy module, include it as a sibling 
    # root objective.
    #

    link.root './node_modules/dependancy/objective'

    #
    # Recurse the source and test directories, the plugin (objective-dev)
    # is listening to the recurse events with a twofold purpose:
    #
    # 1. to run the tests it finds
    # 2. to set a watch on sources and tests to run on change
    # 
    # Note: Tests are also objectives.
    #       But they are children of their respective root.
    #

    .then -> recurse ['spec', 'src'], createDir: true

    #
    # Recurse has completed. Start the prompt. The plugin (objective-dev)
    # has installed some usefull utility commands accessable via the prompt.
    # 
    
    .then -> # prompt.start()

    # .catch (e) ->

    #     #
    #     # Something in the prceding promise chain has failed.
    #     # Show & Tell
    #     # 

    #     console.log('Error -->', e.stack);

    #     #
    #     # The objective won't exit if the repl.listen config
    #     # was present.
    #     # 

    #     # process.exit(1);

