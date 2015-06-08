module.exports = class SomethingClassy

    constructor: (@name) ->

        # instance property (public)

        @flashyCar = 'wife got a poodle?'

        @eatInterval = setInterval (=>@eat()), 50


    # instance methods

    eat: ->

    work: ->

    sit: -> '-h--'

    sleep: (arg) -> "Goodnight #{@name}, sleep #{arg}..."


    # class methods

    @rushHour: ->

