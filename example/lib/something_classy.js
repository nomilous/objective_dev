var SomethingClassy;

module.exports = SomethingClassy = (function() {
  function SomethingClassy(name) {
    this.name = name;
    this.flashyCar = 'wife got a poodle?';
    this.eatInterval = setInterval(((function(_this) {
      return function() {
        return _this.eat();
      };
    })(this)), 50);
  }

  SomethingClassy.prototype.eat = function() {};

  SomethingClassy.prototype.work = function() {};

  SomethingClassy.prototype.sit = function() {
    return '-h--';
  };

  SomethingClassy.prototype.sleep = function(arg) {
    return "Goodnight " + this.name + ", sleep " + arg + "...";
  };

  SomethingClassy.rushHour = function() {};

  return SomethingClassy;

})();
