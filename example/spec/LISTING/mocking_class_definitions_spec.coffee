objective 'Mocking class definitions vs instances', (should) ->

    class Defn

        # @ means this. (coffee-script)

        constructor: (@prop) -> # in arg of constructor, @ means make this.that = that

        fn: -> 'instance method ' + @prop

        @fn: -> 'class method'

        # crazy!? instance and class methods with same name. 
        # (i agree, it's for demonstration purposes)

        @anotherClassMethod: -> 'another'


    after ->

        # everything has been restored.

        d = new Defn('****')
        d.fn().should.equal 'instance method ****'
        Defn.fn().should.equal 'class method'
        Defn.anotherClassMethod().should.equal 'another'


    context 'The simplest: mock the instance after creation', ->

        before -> mock 'myInstance', new Defn('PROP')

        it 'can now inject the instance', (myInstance) -> 

            myInstance.fn().should.equal 'instance method PROP'

        it 'can create expectations on the instance', (myInstance) ->

            myInstance.does fn: -> 'NEW method ' + @prop
            myInstance.fn().should.equal 'NEW method PROP'

        it 'does not affect the classMethod', (myInstance) ->

            myInstance.does fn: -> 'NEW method ' + @prop
            myInstance.fn().should.equal 'NEW method PROP'

            Defn.fn().should.equal 'class method'


    context 'More complicated: mock the prototype', ->

        # Ordinarilly one would be injecting the Defn from defn.js
        # at the corresponding lib/.. path as this test is in the test/.. path
        #
        # before (Defn) -> 
        # 
        # But it's local, so this amounts to the same thing:

        before -> mock 'Defn', Defn

        context 'without known instance', ->

            beforeEach (Defn) -> 

                Defn.does fn: -> 'REPLACED method ' + this.prop

                # .does() - On a class definition replaces on the prototype
                #         - So new instance will have the expectation  

            it 'has the expectation but not the context (this)', (Defn) ->

                d = new Defn('PROPERTY')
                #d.fn().should.equal 'REPLACED method PROPERTY'
                d.fn().should.equal 'REPLACED method undefined'                    
                                                        #
                                                        # no way to get assign 'this' in the stub
                                                        #

                #d.fn.call(d).should.equal 'REPLACED method undefined'
                        #
                        # does not work either, because of the way the stubbing works
                        #                       might become supported later
                        # 

        context 'with known instance', ->

            beforeEach (Defn) ->

                mock 'instance', new Defn('PPROPPERTTY')


            it 'can modify the prototype with existing instance already newd', (Defn, instance) ->

                Defn.does

                    fn: -> 'EXISTING PROP: ' + this.prop

                .as instance

                instance.fn().should.equal 'EXISTING PROP: PPROPPERTTY'


        context 'To mock the class definition', ->

            it 'is necessary to use a Capital letter', (Defn) ->

                # Defn.Does fn: -> 
                # 
                # Not allowed, the same function name was mocked on the instance

                Defn.Does anotherClassMethod: -> 'replaced'

                Defn.anotherClassMethod().should.equal 'replaced'


    it '', -> # - Cleanup happens after each test, this makes the final cleanup visible
              #   so that the after hook effectively has a final after  




