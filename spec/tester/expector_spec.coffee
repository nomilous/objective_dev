{ipso} = require 'ipso'

before ->

    global.objective =

        logger: 

            debug: ->
            TODO: ->
            error: (msg) -> console.log ER: msg
            info: ->

        pipe: on: ->


describe 'expector', ->

    context 'creating does entity', ->


        it 'can use alternate expector name',

            ipso (Expector, should) ->

                global.dev = expectorName: '$does'

                o = Expector.create {}

                should.exist o.$does

                delete global.dev


        it 'add .does() to objects',

            ipso (Expector, should) ->

                o = Expector.create property: 1

                should.exist o.does

                o.property.should.equal 1


        it 'registers an object',

            ipso (Expector, should) ->

                o = {}

                Expector.create o

                o.does b: ->

                Expector.entities[o.$$id].type.should.equal 'object'


        it 'registers a class definition',

            ipso (Expector, should) ->

                c = class Name

                Expector.create c

                c.does instanceMethod: ->

                Expector.entities[c.$$id].type.should.equal 'class'

                Expector.entities[c.$$id].name.should.equal 'Name'




    context 'basic object testing', ->

        it 'creates stub functions on the object',

            ipso (Expector) ->

                o = Expector.create {}

                o.does functionName: ->

                o.functionName.toString().should.match /EXPECTATION_STUB/


        it 'keeps the original function',

            ipso (Expector) ->

                o = Expector.create functionName: -> ### ORIGINAL ###

                o.does functionName: ->

                Expector.entities[o.$$id].originals.functionName[false].fn.should.match /ORIGINAL/


        it 'expectations stack up and run in sequence',

            ipso (Expector, should) ->

                o = Expector.create {}

                o.does functionName: -> 1

                o.does functionName: -> 2

                o.does functionName: -> 3

                for exp in Expector.entities[o.$$id].expectations.functionName

                    exp.type.should.equal 'mock'
                    should.exist exp.fn

                Expector.entities[o.$$id].expectations.functionName.length.should.equal 3

                results = []

                results.push o.functionName()

                Expector.entities[o.$$id].expectations.functionName.length.should.equal 2

                results.push o.functionName()

                Expector.entities[o.$$id].expectations.functionName.length.should.equal 1

                results.push o.functionName()

                Expector.entities[o.$$id].expectations.functionName.length.should.equal 0

                results.should.eql [1,2,3]


        it 'throws on too many calls (unexpected)',

            ipso (Expector) ->

                o = Expector.create {}

                o.does functionName: ->

                o.functionName()

                try

                    o.functionName()

                catch e

                    e.should.match /Too many call/


        it 'spies',

            ipso (Expector) ->

                o = Expector.create functionName: (arg) -> 'original function with ' + arg

                ranSpy = null

                o.does $$functionName: (arg) ->

                    ranSpy = 'with ' + arg

                result = o.functionName 'ARG'

                result.should.equal 'original function with ARG'

                ranSpy.should.equal 'with ARG'


        it 'has the right "this"'



    context 'class testing on instance functions (prototype)', ->


        it 'only creates one id on the class definition',

            ipso (Expector) ->

                c = class ClassName

                Expector.create c

                first = c.$$id

                Expector.create c

                second = c.$$id

                first.should.equal second


        it 'does not create expectation stubs on the class definition',

            ipso (Expector, should) ->

                c = class ClassName

                Expector.create c

                c.does functionName: -> 1

                should.not.exist c.functionName


        it 'creates expectations on future instances of the class',

            ipso (Expector, should) ->

                c = class AnotherClassName

                    existingInstanceMethod: -> 1

                Expector.create c

                c.does functionName: -> 2

                instance = new AnotherClassName

                should.exist instance.existingInstanceMethod
                
                should.exist instance.functionName

                # console.log 'problem?', c.$$id, instance.$$id


        it 'keeps the original function',

            ipso (Expector, should) ->

                c = class ClassName

                    existing: -> ### ORIGINAL ###

                Expector.create c

                c.does existing: ->

                should.exist Expector.entities[c.$$id].originals.existing[false].fn.toString().should.match /ORIGINAL/

                Expector.entities[c.$$id].originals.existing[false].type.should.equal 'class'

        it 'can spy',

            ipso (Expector) ->

                c = class ClassName 

                    functionName: -> 1

                Expector.create c

                ran = false

                c.does $$functionName: -> ran = true

                instance = new ClassName

                instance.functionName().should.equal 1

                ran.should.equal true

        it 'can spy on the constructor??',

            ipso (Expector) ->

                # c = class ClassName

                #     constructor: ->

                #         console.log constructor: arguments

                # Expector.create c

                # c.does

                #     constructor: ->


                # instance = new ClassName 'Arguments'

        it 'has the right "this"',

            ipso (Expector, should) ->

                class Thing

                    constructor: -> @value = 1

                    fn: -> @value

                Expector.create Thing

                t = new Thing

                Thing.does

                    fn: -> @value + @value

                .as t

                t.fn().should.equal 2


    context 'testing on inherited functions', ->

        it 'why would you want to do that',

            ipso (Expector) ->

                # Parent.does ...

                # Child.does...


    context 'testing on class functions', ->


        it 'is done with capital Does',

            ipso (Expector, should) ->

                class ClassName

                    @classMethod: -> ### ORIGINAL ###

                Expector.create ClassName

                ClassName.Does

                    classMethod: -> 1


                Expector.entities[ClassName.$$id].originals.classMethod[true].fn.toString().should.match /ORIGINAL/

                ClassName.classMethod().should.equal 1

        it 'can spy',

            ipso (Expector) ->

                class ClassName

                    @classMethod: -> 1

                Expector.create ClassName

                ran = false

                ClassName.Does $$classMethod: -> ran = true

                ClassName.classMethod().should.equal 1

                ran.should.equal true


        it 'has the right "this"',

            ipso (Expector) ->

                class ClassName

                    @classMethod: ->

                        console.log @classMethod

                Expector.create ClassName

                ClassName.Does

                    classMethod: -> return @

                ClassName.classMethod().should.eql ClassName



    context 'testing on faux class with "this"', ->

    context 'doesnt', ->

        it 'throws excepition if it does',

            ipso (Expector) ->

                e = Expector.create {}

                # e.doesnt fn: ->


    context 'mock', ->

        it 'can doesify objects',

            ipso (Expector, should) ->

                Expector.does _create: ->

                mock t = {}

                should.exist t.does

                should.exist mock(class Testing).does


        it 'can be used to create aliased objects for injection',

            ipso (Expector, Injector, should) ->

                Injector.does register: (name, object) ->

                    name.should.equal 'mocked1'
                    object.should.equal Name

                should.exist mock('mocked1', class Name).does

        
        it 'can be injected',

            ipso (Expector, Injector, should) ->

                should.exist mock('mocked2', class Name).does

                o = Injector.load 'mocked2'

                o.prototype.constructor.name.should.equal 'Name'



        it 'does not allow overwrite if created by ancestor node in test tree'

        
        it 'is not removed from '


    context 'beforeEach vs beforeAll', ->

        it 'expectations dont throw if created in beforeAll'

        it 'expectations remain in place if created in ancestor beforeAll'

        it 'expectations cannot be created in a child beforeAll if applies over existing beforeEach'

            # i.e. if there is a beforeAll expectation, it must be the first in the stack
        it 'does not allow mock anonymously (not in test or hook'
            

    context 'report', ->


    context 'flush', ->







    context 'class testing on "this" functions', ->