function TimeoutError() {
  e = Error.apply(this, arguments);
  var _this = this;
  var _arguments = arguments;
  Object.defineProperty(this, 'name',    {value: 'TimeoutError'})
  Object.defineProperty(this, 'message', {value: e.message})
  Object.defineProperty(this, 'frames',  {get:function(){return e.frames}});
  Object.defineProperty(this, 'stack',   {get:function(){return e.stack}});
  Object.keys(arguments[1] || {}).forEach(function(key) {
    Object.defineProperty(_this, key, {value: _arguments[1][key]});
  });
}

TimeoutError.prototype = Error.prototype;
TimeoutError.prototype.constructor = TimeoutError;

module.exports = TimeoutError;