var mongoose = require('mongoose')

var Player = mongoose.model('Player')
var ChatItem = mongoose.model('ChatItem')

function handleError(err) {
  console.log(err);
  return err;
}

function chat(socket, player, value, mode) {
  var chat_item = new ChatItem({ player_uuid: player.uuid, player_name: player.name, value: value })
  chat_item.save();          
  if(mode == "everyone" || mode == "everyone else") 
    socket.broadcast.emit('chat-update', chat_item); // broadcast to everyone
  if(mode == "everyone" || mode == "sender") 
    socket.emit('chat-update', chat_item); // send back to this socket
}

module.exports = function (io) {
  io.sockets.on('connection', function (socket) {

    socket.on('uuid-check', function (data) {
      Player.findOne({ uuid: data.uuid }, function(err, player) {
        if(err) return handleError(err);
        if(player) {
          chat(socket, {name: "System"}, "Welcome back, " + player.name, "sender");
        } else {
          chat(socket, {name: "System"}, "Hi, what's your name?", "sender");
        }
      });
    });

    socket.on('chat-submit', function (data) {            
      // check if player exists
      Player.findOne({ uuid: data.uuid }, function(err, player) {
        if(err) return handleError(err);
        if(!player) {
          player = new Player({ uuid: data.uuid, name: data.value });
          player.save();
          chat(socket, {name: "System"}, "Have fun chatting, " + player.name, "sender");
          chat(socket, {name: "System"}, player.name + " entered the room.", "everyone else");
        } else {
          chat(socket, player, data.value, "everyone")          
        }
      });      
    });

  });
}
