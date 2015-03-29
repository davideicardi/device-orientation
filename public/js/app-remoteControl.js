var socket = io();

var pi = 3.14159265359;
function degToRad(deg) {
  return deg * (pi/180);
}

var RemoteControl = function(){

    this.steer = 0;  // from -1 (full left) to 1 (full right)
    this.acceleration = 0;  // from -1 (full brake) to 1 (full acceleration)
    
    var me = this;
    socket.on('test-orientation', function(orientation) {

      var isFaceDown = Math.abs(orientation.beta);
      var x = isFaceDown > 90 ? -180 + (orientation.gamma + 90) : orientation.gamma + 90;
      var z = isFaceDown > 90 ? 180 - orientation.beta : orientation.beta;

      me.steer = Math.sin(degToRad(z));
      me.acceleration = Math.sin(degToRad(x));
    });

    return this;  
};


exports.RemoteControl = RemoteControl;