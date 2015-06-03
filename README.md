# objective-dev

todo
----
* online creation
* collision warn
* the actual testing

docs
----

* [sS]ubject injection


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
fs.stub({
    readFileSync: function(filename) {
        if (filename == './config.json') return JSON.stringify({});
        original(filename); // if not, pass onward to original readFileSync
    }
});
// server.start('./config.json');
```
* It has the same symantics as `.does()` for Classes (ie. `.Stub`)

### Intricasies. (All together now)


