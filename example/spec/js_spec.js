objective(function() {

  before(function() {
    mock('thing');
  })

  xit('uses function name for mock if no list provided', function(thing) {
    

    var got = mock('got').does(function have() {});

    thing.does(
      function configure() {
        return thing;
      },
      function get(){
        return got;
        // mock('got').does(
        //   function have() {
        //     /* expectation created inside expectation will only */
        //     /* be activated if the outer expectation is met */
        //   }
        // );
      }
    );

    thing.configure() //.get().have();
    // ExpectationError: Missing call(s) to thing.get(), got.have()

  });
});
