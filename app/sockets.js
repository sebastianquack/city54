var mongoose = require('mongoose')
var Player = mongoose.model('Player')

module.exports = function (io) {

  io.sockets.on('connection', function (socket) {

    socket.on('uuid-check', function (data) {

      Player.findOne({ uuid: data.uuid }, function(err, result) {
        if(err) return;
        
        if(result) {
          socket.emit('hello', { name: result.name });
        }
      });

    });

    socket.on('chat-submit', function (data) {
            
      Player.findOne({ uuid: data.uuid }, function(err, result) {
        if(err) return;
        
        if(result == null) {
          var new_player = new Player({ uuid: data.uuid, name: data.value });
          new_player.save();
        } else {
          result.name = data.value;
          result.save();
        }
      });

      socket.emit('chat-update', data);
    });

  });

}
