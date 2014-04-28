var mongoose = require('mongoose')
var Player = mongoose.model('Player')
var ChatItem = mongoose.model('ChatItem')
var joke = "langweiliger witz"
var Cleverscript = require('./cleverscript')
var Spreadsheets = require('./spreadsheets')


function handleError(err) {
  console.log(err)
  return err
}

function chat(socket, player, value, mode) {
  var chat_item = new ChatItem({ player_uuid: player.uuid, player_name: player.name, value: value })
  chat_item.save()          
  if(mode == "everyone" || mode == "everyone else") 
    socket.broadcast.emit('chat-update', chat_item) // broadcast to everyone
  if(mode == "everyone" || mode == "sender") 
    socket.emit('chat-update', chat_item) // send back to this socket
}

function parseCommand(socket, player, value) {
  var words = value.split(" ")
  if(words.length >= 2) {
  		
    if(words[0] == 'bot') {
      words.splice(0,1)
      botCommand = words.join(" ")
      chat(socket, {name: "System"}, player.name + " called bot with: " + botCommand, "everyone")
    
      
      // cleverscript
      Cleverscript.talkToBot(process.env.cleverAPIKey, botCommand, player.botState, joke, function(data) {
        console.log(data)
        chat(socket, {name: "Bot"}, data.output, "everyone")
        player.botState = data.cs
        player.save()
        if(data.newjoke_other) {
          joke = data.newjoke_other
        }
      })
      
      return true
    }

    else {
      if (words[0] == "gehe") {
        
        // room callback
        roomEntered = function(data){
          for (i in data.command) {
            if (data.command[i] == "base") greeting = data.text[i]
          }
          chat(socket, {name: "room"}, linkify(greeting), "everyone")
        }     
        
        Spreadsheets.loadRoom(words[1], roomEntered)
      }
    }

  }
  return false
}

module.exports = function (io) {
  io.sockets.on('connection', function (socket) {

    socket.on('uuid-check', function (data) {
      Player.findOne({ uuid: data.uuid }, function(err, player) {
        if(err) return handleError(err)
        if(player) {
          chat(socket, {name: "System"}, "Welcome back, " + player.name, "sender")
        } else {
          chat(socket, {name: "System"}, "Hi, what's your name?", "sender")
        }
      })
    })

    socket.on('chat-submit', function (data) {            
      // check if player exists
      Player.findOne({ uuid: data.uuid }, function(err, player) {
        if(err) return handleError(err)
        if(!player) {
          player = new Player({ uuid: data.uuid, name: data.value })
          player.save()
          chat(socket, {name: "System"}, "Have fun chatting, " + player.name, "sender")
          chat(socket, {name: "System"}, player.name + " entered the room.", "everyone else")
        } else { // Player exists         
          if(!parseCommand(socket, player, data.value)) { // if command is not found, assume this is part of the chat
            chat(socket, player, data.value, "everyone")                      
          }
        }
      })      
    })

  })
}

function linkify(text) {
	return text.replace(/\[(.*?)\|(.*?)\]/g,'<b data-command="$2">$1</b>')
}
