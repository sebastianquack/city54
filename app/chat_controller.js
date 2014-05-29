/* variable declarations */

var mongoose = require('mongoose')
var Bots = mongoose.model('Bot')
var Player = mongoose.model('Player')
var Cleverscript = require('./apis/cleverscript')
var RegexChatExit = /^(exit|ciao|tschüss|tschüssikowski|bye|bye bye|auf wiedersehen|wiedersehen)+[\s!\.]*$/i

var Util = require('./util.js')
var World = require('./world_controller.js')

/* function declarations */

var leaveChat = function(socket, player) {
  if (player.currentChat != player.currentRoom)
    socket.leave(player.currentChat) // do not leave room feed
  player.previousChat = player.currentChat
  player.currentChat = ""
  player.state = "world" // send player back into world
  // no save, chat is volatile
}

// handle player chat
var handleInput = function(socket, player, input) {
  
  if(typeof input == "string" && input.search(RegexChatExit) != -1) { // leave chat
    leaveChat(socket, player)
    World.handleInput(socket, player, null)
    return
  }

  if (input != null & input != "") {
    // reflect player input back to player
    Util.write(socket, player, player, input , "sender") 
    // send input to other chat members
    Util.write(socket, player, player, input , "chat")

    Player
    .find({ 'currentRoom': player.currentRoom })
    .where('previousChat').ne(player.currentChat)
    .where('_id').ne(player._id)
    .where('state').equals("world")
    //.select('_id')
    .exec(function (err, availableRoomPlayers) {
      // TODO: error handling

      if (availableRoomPlayers != null && availableRoomPlayers.length > 0) {
        for (i in availableRoomPlayers) {
          console.log(availableRoomPlayers[i].name)
          console.log(availableRoomPlayers[i].currentChat)
          console.log(availableRoomPlayers[i].previousChat)
          console.log(availableRoomPlayers[i].state)
          availableRoomPlayers[i].currentChat = player.currentChat
          availableRoomPlayers[i].state = "chat"
        }
      }

    })
  }
  
}

/* expose functionality */
module.exports.leaveChat = leaveChat
module.exports.handleInput = handleInput