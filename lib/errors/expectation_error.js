function ExpectationError() {
  e = Error.apply(this, arguments);
  var _this = this;
  var _arguments = arguments;
  Object.defineProperty(this, 'name',    {value: 'ExpectationError'})
  Object.defineProperty(this, 'message', {value: e.message})
  Object.defineProperty(this, 'frames',  {get:function(){return e.frames}});
  Object.defineProperty(this, 'stack',   {get:function(){return e.stack}});
  Object.keys(arguments[1] || {}).forEach(function(key) {
    Object.defineProperty(_this, key, {
      enumerable: true,
      get: function(){return _arguments[1][key]}
    });
  });
}

ExpectationError.prototype = Error.prototype;
ExpectationError.prototype.constructor = ExpectationError;

module.exports = ExpectationError;
