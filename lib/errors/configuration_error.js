function ConfigurationError() {
  e = Error.apply(this, arguments);
  var _this = this;
  var _arguments = arguments;
  Object.defineProperty(this, 'name', {value: 'ConfigurationError'})
  Object.keys(arguments[1] || {}).forEach(function(key) {
    Object.defineProperty(_this, key, {
      enumerable: true,
      get: function(){return _arguments[1][key]}
    });
  });
}

ConfigurationError.prototype = Error.prototype;
ConfigurationError.prototype.constructor = ConfigurationError;

module.exports = ConfigurationError;
