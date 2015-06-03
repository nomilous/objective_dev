# objective-dev

todo
----
* online creation
* collision warn
* the actual testing

docs
----

* [sS]ubject injection



`.does()` and `.mock()`
-----------------------
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
* Function expectations on a class are created against the prototype functions and not the classMethods
* It is necessary to pass the instance being tested with .as() for correct `this`.
* but...
```js
mock(new ClassThing()).does(...)
```
* ...achieves similar.
