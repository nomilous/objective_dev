objective(function() {

  before(function() {
    mock('thing');
  })

  it.only('uses function name for mock if no list provided', function(thing) {
      
    thing.does(
      function configure() {},
      function get(){
        return mock('got').does(
          function have() {
            /* carried away */
          }
        );
      }
    );

    // thing.get();

  });
});
