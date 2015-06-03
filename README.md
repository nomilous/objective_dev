# objective-dev

todo
----
* online creation
* collision warn
* the actual testing

docs
----
## Conventions

## Configurations

## Prompt Tools

## Repl

## Test Architecture and Flow Contol

## Reporter

## Module Injection

## Function Expectations

### `.does()` and `.mock()`

* These are both the same. They create function expectations.
```js
thing.does({
    functionName: function() {
        
    },
    anotherFunction: function(arg1) {
        assert(arg1,...)
    }
});
```
* They can only be created in beforeEachs and tests ('it's)
* The test will fail unless the expected funcitons are called exactly once.
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
    lstatSync: function(filename) {
        console.log('lstatSync(%s...',filename);
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
        original(filename); // if not, pass onward to original readFileSync
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


 
## `wait()` & `see.`


