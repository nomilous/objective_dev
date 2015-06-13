function TimeoutError() {
  e = Error.apply(this, arguments);
  var _this = this;
  var _arguments = arguments;
  Object.defineProperty(this, 'name', {value: 'TimeoutError'})
  Object.keys(arguments[1] || {}).forEach(function(key) {
    Object.defineProperty(_this, key, {
      enumerable: true,
      get: function(){return _arguments[1][key]}
    });
  });
}

TimeoutError.prototype = Error.prototype;
TimeoutError.prototype.constructor = TimeoutError;

module.exports = TimeoutError;
