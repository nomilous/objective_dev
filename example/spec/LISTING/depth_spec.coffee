objective (should) ->



    class Thing

        method: -> 'ORIGINAL'

    before -> mock 'thing', new Thing

    context 'deeper 1', ->

        beforeEach (thing) ->

            thing.does method: -> 'REPLACED'

        it 'has been replaced', (thing) ->

            thing.method().should.equal 'REPLACED'


    context 'deeper 2', ->

        it 'has the original', (thing) ->

            thing.method().should.equal 'ORIGINAL'

    it 'also has the original back at root', (thing) ->

        thing.method().should.equal 'ORIGINAL'



    class AnotherThing

        method: -> 'ORIGINAL'


    before -> mock 'AnotherThing', AnotherThing

    context 'deeper', ->

        beforeEach (AnotherThing) ->

            AnotherThing.does

                method: -> 'REPLACED'

        it 'replaced on the prototype', (AnotherThing) ->

            a = new AnotherThing

            a.method().should.equal 'REPLACED'

            # console.log AnotherThing.prototype.method.toString()

    context 'deeper 2', ->

        it 'has the original', (AnotherThing) ->

            a = new AnotherThing

            a.method().should.equal 'ORIGINAL'

            # console.log AnotherThing.prototype.method.toString()



    class ThingNine

        constructor: (@property) ->

        getIt: -> @property


    before -> mock 'ThingNine', ThingNine


    context 'deeper', ->

        it 'can mock on the class prototype but requires .as(instance) for thisness', (ThingNine) ->

            t9 = new ThingNine('constructor property')

            ThingNine.does(

                getIt: -> "changed #{@property}"

            ).as t9

            t9.getIt().should.equal 'changed constructor property'


