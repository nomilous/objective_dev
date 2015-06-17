
[1]:https://github.com/nomilous/objective
[2]:#module-injection




## Summary

* You've installed [objective][1] globally. 
* Create a default dev objective.

```bash
objective --create-dev --js ## --json # Writes the config
                                      # into a parallel json instead.
. warn created file objective.js +0ms

```

* It wrote the file `objective.js` containing the configs necessary to run <b>objective-dev</b>

```js
// objective.js
objective({
  title: 'Titled Objective', 
  uuid: 'a9b74ee3-eef2-495e-827e-237728c0c452', // for onlineness (later)
  description: '',
  repl: {
    // can attach a second repl (objective --attach; in same dir)
    listen: '/tmp/socket-a9b74ee3-eef2-495e-827e-237728c0c452'
  },
  plugins: {
    'objective-dev': {
      testDir: 'spec',
      testAppend: '_spec', // spec dir might contain more than tests, how to match them
      sourceDir: 'lib'
    }
  }
}).run(function(recurse) {

  // recurse lib and spec directories for files to watch / run tests on change
  return recurse(['lib', 'spec'], {
    createDir: true // create lib and spec dirs if not present
  }).then(function() {
    // do other things after recurse
  });
});
```

* To run the objective.

```bash
objective
# it finds objective.js or objective.coffee in the local directory and runs it
# or, for info junkies
DEBUG=* objective
# p.s. best to always keep error,warn in the debug matchstring.
```

* The objective runs all the tests it finds in the specified <b>testDir</b>.
* It also starts a watch on all <b>sourceDir</b> and <b>testDir</b> files. 
* On file changes it will re-run tests appropriately (modules are flushed as necessary).
* The objective now presents with a repl prompt.
* The repl has access to node's global. Attached is the objective itself.
* e.g.

```bash
Titled Objective> objective.logger.warn('message')
  warn message +5s
undefined

Titled Objective> objective.plugins.dev  (tab, tab, tab)
Titled Objective> 
```  

## Running Silently on Commandline

For continuous deploment type activities (travis, circle, codeship & co)

* pending

## Configurations

### Linking

## Repl Tools

## Test Tools

The testing toolkit has followed mocha's conventions, but with some teaks and additions.

### Context Nodes

Context nodes are used to organize tests into groups or to arrange things such that a certain sequence of before hooks runs ahead to set up the context being tested.

#### `context()` and `describe()`

* These are exactly the same.
* Also supported is `context.only()` to skip all tests not within the context.
* Also supported is `xcontext()` to skip all tests within the context.
* `context()` and `describe()` perform [Module Injection][2]. (see below)

### Hooks

* All hooks support [Module Injection][2]. (see below)
* `done()` is not the first argument passed to the hook, it is passed at the argument labelled 'done', ie:

```js
before(function(InjectedModule, http, done) {
    InjectedModule; // from lib/**/injected[_-M/m]odule.js
    http;          // node http module
    done();
});

```
* Exceptions and Timeouts in hooks cause the entire test run to terminate. (PENDING - run appropriate afters tho)

#### `before()` and `xbefore()`

* These run <b>beforeAll</b> tests.
* They run (or <b>x</b>don't run) once and only once.
* They run before any tests or contexts.
* They do not run if there are no tests.
* There can be as many as necessary.
* For coffee-script pleasure, this can also be done:

```coffee
before
    each: ->
    all: ->
```

#### `beforeEach()` and `xbeforeEach()`

* These run <b>beforeEach</b> test.
* They run up the tree, ie:

```js
beforeEach(function(){});

context('nested', function(){

    beforeEach(function(){});

    context('deeper', function(){

        beforeEach(function(){});

        // All three beforeEaches run before this 
        it();

        // And all again before this
        it();
     });
});
```

#### `beforeAll()`

* Same as `before()`. Just clearer.

#### `after()` and `afterEach()` and `afterAll()`

* Differs from `before()`s. 
* In the same way that `Once upon a time,` differs from `Happily ever after.`


### Tests

#### `it()` and `xit()` and `it.only()`

* Modules can be injected in the same manner as hooks and contexts.
* PENDING - calling done multiple times fails the test.
* `this.timeout(n)` modifies the test timeout.
* `this` in the test is the same (context) as `this` in all hooks before and after
* More then one `.only()` - then both run.


### Special Operators

#### `help()`

* Display node api markdown docs or sections of docs among the test output.

eg. 
```javascript

it('can display core module markdown help in console', function(http) {

  help( http.Server )
  // no pager yet (maybe never?)

})

```


#### `mock()`

#### `wait()` & `see.*`

#### `trace()`

##### in test
* trace() prints a filtered stack trace
* trace(false) prints an unfiltered stack trace
* trace(function(frame, line, i){}) calls with each stack frame
* trace(n)
* trace(n, function)
* trace(/regex/)
* trace(/regex/,function)

eg.
```javascript
it("can get a trace from the mock's perspective", function(should) {
  Server.does({
    setRoutes: function(){
      trace( 0 , function(stackFrame) {
        stackFrame.Function.toString().should.match(/THIS_FUNCTION/);
        // console.log(stackFrame.This);
      })
    }
  });
  Server.start();
})
 ``` 

##### on test faulure
* trace = true or false switches stack trace on/of per test or context
* trace.filter = true or false or /regex/ set trace filter per test or context

#### `flush()`

## Module Injection

## Function Expectations

Function expectations can only be created in <b>beforeEach</b>s and <b>tests</b>.

### `.does()` and `.mock()`

* These are both the same. They create function expectations.
```js
thing.does({
    expectedFunction: function() {
        
    },
    another: function(arg1) {
        assert(arg1,...)
    }
});
```
* The test will fail unless the expected funcitons are each called exactly once.
* If they are expected to be called twice, use thing.does(..) twice to say so.

```js
ClassThing.does({
    functionName: function() {
        this.property == instance.property
    }
}).as(instance);
```

* Function expectations on a class are created against the prototype functions and not the classMethods (to create expectations agains the classMethods use `.Does()`)
* It is necessary to pass the instance being tested with .as() for correct `this`.
* but...

```js
mock(new ClassThing()).does(...);
```

* ...achieves similar.

### `.spy()`

* This creates a spy on the specified function.
* The spy function is run and receives the arguments as called.
* The original function is run after the spy.
* It is not an expectation. ie. Test will not fail if spy not called. (Unless... see Intricasies below)

```js
// see what require() does:
fs.spy({
    readFileSync: function(filename) {
        console.log('readFileSync(%s...',filename);
    },
    statSync: function(filename) {
        console.log('statSync(%s...',filename);
    }
});
require('module');
```

* It has the same symantics as `.does()` for Classes (ie. `.Spy`)

### `.stub()`

* This replaces the original function.
* It is not an expectation. ie. Test will not fail if stub not called. (Unless... see Intricasies below)

```js
// pretend some specific file is present
thisTestConfig = {};
fs.stub({
    readFileSync: function(filename) {
        if (filename == './config.json') return JSON.stringify(thisTestConfig);
        mock.original(filename); // if not, pass onward to original readFileSync
    }
});
server.start('./config.json');
```
* It has the same symantics as `.does()` for Classes (ie. `.Stub`)

### Intricasies. (All together now)

* `.does()` and `.mock()` create <b>expectations</b>.
* `.spy()` and `.stub()` create <b>spies</b> and <b>stubs</b>.
* They can all be used in conjunction.
* The resulting behaviour gets complicated.

#### First try to explain in words.

* <b>stub</b> on top of <b>expectations</b> invalidates them. Test no longer fails.
* <b>spy</b> on top of <b>expectations</b> does not call on to the `original` function but rather to the expectation (next call, next expectation). Test will still fail if expectations not met.
* <b>expectation</b> on top of <b>spy</b> still runs the spy (first). Test will still fail if expectation not met.
* <b>expectation</b> on top of <b>stub</b> will fail test if unmet.
* <b>stub</b> on top of <b>spy</b> invalidates it. Spy will no longer be called.
* <b>spy</b> on top of <b>stub</b> will first call the spy then the stub (as if the stub is the original function)
* <b>spy</b> on top of <b>spy</b> will call both ahead of original unless there is a stub between them.
* <b>stub</b> on top of <b>stub</b> will call only the most recent.

#### Example 1

```js
objective(function(){
    
    context('y', function(MyThing) {

        beforeEach(function(){

            // Never call original MyThing.fn() for entire context
            MyThing.stub({fn:function(){}}); // 1

            // Expect y() to be called with each test
            MyThing.does({y:function(){}});  // 2

        });

        context('special case y', function(should){

            it 'should call both', function() {

                // Expectation on top of stub
                MyThing.does({
                    fn: function(arg1) { // 3
                        arg1.should.equal('ok');
                    }
                });

                // Test will fail if fn() (from 3) and y() (from 2) 
                // are not called in MyThing.below
                MyThing.somethingThatShouldCallBoth();

            });

            it 'shouldnt call either', function() {

                // The expectation created in the previous test (3) is no
                // longer in play. But the stub from (1) and the expectation
                // from (2) are still present because they were set in a
                // related (ancestral) beforeEach.
                //      
                //     note: beforeEachs run all the way to 
                //           the test root before every it

                MyThing.spy({
                    fn: function() {
                        throw new Error('Should not run fn()');
                    }
                    // Cannot remove the expectation from (2) with a spy...
                    // because the spy still calls onward to the expectation
                });

                MyThing.stub({
                    // so stub it...
                    y:function(){
                        throw new Error('Should not run y()');
                    }
                });

                MyThing.somethingThatShouldntCallEither();

            });

        });

    });

});
```

#### Example 2

This time coffee-script.

```coffee

objective 'Explain', ->

    class Impaler

        charityWork: -> 'no way!'


    before -> mock 'vlad', new Impaler()        # same instance for all tests

    # beforeEach -> mock 'vlad', new Impaler()  # new instance for each test

    it 'shows original function', (vlad) ->

        vlad.charityWork().should.equal 'no way!'

    it 'explain expectation stack sequence', (vlad) ->

        vlad.does charityWork: -> 'serve soup'
        vlad.does charityWork: -> 'tend crops'
        vlad.does charityWork: -> 'mend fences'

        # expectations are run in the sequence they were created.

        vlad.charityWork().should.equal 'serve soup'
        vlad.charityWork().should.equal 'tend crops'
        vlad.charityWork().should.equal 'mend fences'
        # vlad.charityWork() # fail, called too many times.

    it 'explains the effect of stub', (vlad) ->

        vlad.does charityWork: -> 'serve soup'
        vlad.does charityWork: -> 'tend crops'
        vlad.stub charityWork: ->
        vlad.does charityWork: -> 'mend fences'

        # stub invalidates preceding expectations

        vlad.charityWork().should.equal 'mend fences'
        # vlad.charityWork() # fail, called too many times.

    it 'explains stub after expectations', (vlad) ->

        vlad.does charityWork: -> 'serve soup'
        vlad.does charityWork: -> 'tend crops'
        vlad.does charityWork: -> 'mend fences'
        vlad.stub charityWork: -> 'HAVE TANTRUM'

        # stub is last, all preceding expectations are invalidated

        vlad.charityWork().should.equal 'HAVE TANTRUM'
        vlad.charityWork().should.equal 'HAVE TANTRUM'
        vlad.charityWork().should.equal 'HAVE TANTRUM'
        vlad.charityWork().should.equal 'HAVE TANTRUM'

        # no limit to calls (same as stub by itself)

    it 'explains the effect of spy', (vlad) ->

        vlad.spy charityWork: -> console.log 'in spy 1', arguments
        vlad.spy charityWork: -> console.log 'in spy 2', arguments

        # spy observes, original function is still called

        vlad.charityWork('arg', 'uments').should.equal 'no way!'

        #
        # outputs:
        # in spy 1 { '0': 'arg', '1': 'uments' }
        # in spy 2 { '0': 'arg', '1': 'uments' }
        #

    it 'explains the effect of spy mixed with expectations', (vlad) ->

        vlad.spy charityWork: -> console.log 'in spy 1', arguments
        vlad.spy charityWork: -> console.log 'in spy 2', arguments
        vlad.does charityWork: -> 'serve soup'
        vlad.spy charityWork: -> console.log 'in spy 3', arguments

        vlad.charityWork('arg', 'uments').should.equal 'serve soup'
        
        #
        # outputs:
        # in spy 1 { '0': 'arg', '1': 'uments' }
        # in spy 2 { '0': 'arg', '1': 'uments' }
        # in spy 3 { '0': 'arg', '1': 'uments' }
        # 

        # vlad.charityWork() # fail, called too many times.

        # spies are not run on the second call

    it 'explains spies mixed with stub and expectation', (vlad) ->

        vlad.spy charityWork: -> console.log 'in spy 1', arguments
        vlad.spy charityWork: -> console.log 'in spy 2', arguments
        vlad.does charityWork: -> 'serve soup'
        vlad.stub charityWork: -> 'IMPALE SOMEBODY'
        vlad.spy charityWork: -> console.log 'in spy 3', arguments

        vlad.charityWork('arg', 'uments').should.equal 'IMPALE SOMEBODY'
        vlad.charityWork('arg', 'uments').should.equal 'IMPALE SOMEBODY'
        vlad.charityWork('arg', 'uments').should.equal 'IMPALE SOMEBODY'
        vlad.charityWork('arg', 'uments').should.equal 'IMPALE SOMEBODY'

        # the stub has invalidated the preceding expectation and spies

        #
        # outputs:
        # in spy 3 { '0': 'arg', '1': 'uments' }
        # in spy 3 { '0': 'arg', '1': 'uments' }
        # in spy 3 { '0': 'arg', '1': 'uments' }
        # in spy 3 { '0': 'arg', '1': 'uments' }
        #

```

## Reporter

