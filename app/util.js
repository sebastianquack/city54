var mongoose = require('mongoose')
var ChatItem = mongoose.model('ChatItem')

// handle errors
var handleError = function(err) {
  console.log(err)
  return err
}

// returns first word
var getCommand = function(input) {
  if(input) {
    var words = input.split(" ")
    return words[0]
  } else {
    return null
  }
}

// returns string without first word
var getObject = function(input) {
  var words = input.split(" ")
  if(words.length < 2) {
    return ""
  }
  words.splice(0,1)
  return words.join(" ")
}

// send text to client
var write = function(socket, player, value, mode, type) {
  var chat_item = new ChatItem({ 
    player_uuid: player.uuid, 
    player_name: player.name, 
    player_room: player.currentRoom, 
    player_state: player.state,
    value: value, 
    type: type
  })
  chat_item.save()

  // broadcast to everyone
  if(mode == "everyone")  
    socket.broadcast.emit('chat-update', chat_item)

  // broadcast to everyone else in room
  if(mode == "everyone else") {
    socket.broadcast.to(player.currentRoom).emit('chat-update', chat_item) 
  }

  // broadcast to everyone else in room and sender
  if(mode == "everyone else and me") {
    socket.to(player.currentRoom).emit('chat-update', chat_item)
    socket.broadcast.to(player.currentRoom).emit('chat-update', chat_item) 
  }

  // send back to this socket
  if(mode == "everyone" || mode == "sender") 
    socket.emit('chat-update', chat_item) // TODO send to all sockets of player
}

module.exports.getCommand = getCommand
module.exports.getObject = getObject
module.exports.handleError = handleError
module.exports.write = write