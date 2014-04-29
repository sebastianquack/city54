/* variable declarations */

var mongoose = require('mongoose')
var Player = mongoose.model('Player')
var ChatItem = mongoose.model('ChatItem')
var joke = "langweiliger witz" // just for testing, todo: manage bot variables in db
var Cleverscript = require('./apis/cleverscript')
var Spreadsheets = require('./apis/google_spreadsheets')
var rooms = ['witten', 'oberhausen', 'gelsenkirchen']    

/* function declarations */

function handleError(err) {
  console.log(err)
  return err
}

// parse world descriptions for links
function linkify(text) {
	return text.replace(/\[(.*?)\|(.*?)\]/g,'<b data-command="$2">$1</b>')
}

// returns first word
function getCommand(input) {
  if(input) {
    var words = input.split(" ")
    return words[0]
  } else {
    return null
  }
}

// returns string without first word
function getObject(input) {
  var words = input.split(" ")
  if(words.length < 2) {
    return ""
  }
  words.splice(0,1)
  return words.join(" ")
}

// send text to client
function chat(socket, player, value, mode) {
  var chat_item = new ChatItem({ player_uuid: player.uuid, player_name: player.name, value: value })
  chat_item.save()          
  if(mode == "everyone" || mode == "everyone else") 
    socket.broadcast.emit('chat-update', chat_item) // broadcast to everyone
  if(mode == "everyone" || mode == "sender") 
    socket.emit('chat-update', chat_item) // send back to this socket
}

/* react to to player actions in different situations */

// handle introduction
function intro(socket, player, input) {
  
  switch(player.state) {
    case "name": 
      player.name = input
      chat(socket, {name: "System"}, "Danke! Du springst aus dem Flugzeug, öffnest den Fallschirm und landest in...", "sender")
      player.currentRoom = rooms[Math.floor(Math.random()*rooms.length)]
      player.state = "world"
      player.save()
      explore(socket, player, null)
      break
    default:
      chat(socket, {name: "System"}, "Hallo! Du bist in einem Flugzeug und fliegst über das Ruhrgebiet. Es ist 2044. Wie heißt du?", "sender")
      player.state = "name"
      player.save()
      break
  }
}

// handle world exploration
function explore(socket, player, input) {
  
  if(!input) {
    var roomEntered = function(data){
      for (i in data.command) {
        if (data.command[i] == "base") greeting = data.text[i]
      }
      chat(socket, {name: "System"}, linkify(greeting), "everyone")
      chat(socket, {name: "System"}, player.name + " hat den Raum betreten.", "everyone else") // todo only to people in room  
      player.currentRoomData = data;
      player.save()
        console.log(player.currentRoomData)
  console.log(data)
    }     
    Spreadsheets.loadRoom(player.currentRoom, roomEntered)
    return
  }
  
  var command = getCommand(input)
  var object = getObject(input)


  // parse room commands
  var roomCommandFound = false
  if (player.currentRoomData != undefined)
  {
    data = player.currentRoomData
    for (i in data.command) {
      if (data.command[i] == command && data.object[i] == object) { // TODO: condition (worldVariable), SYNONYMS
        
        roomCommandFound = true

        // TODO: effect -> worldVariable

        reply = data.text[i] 
        chat(socket, {name: "System"}, linkify(reply), "everyone") // todo only to people in room  

        // leave room
        if (data.exit != undefined data.exit[i].length > 0) {
          player.currentRoom = data.exit[i]
          player.currentRoomData = {}
          player.save()
          chat(socket, {name: "System"}, player.name + " hat den Raum verlassen.", "everyone else") // todo only to people in room
          //if (reply == "") chat(socket, {name: "System"}, "Du verlässt den Raum...", "sender") // todo get response from db        
          explore(socket, player, null)
        }

        // touch bot
        if (data.bot != undefined data.bot[i].length > 0) {
          player.state = "bot"
          player.save()
          botChat(socket, player, null)
        }

        // play audio
        if (data.audio != undefined && data.audio[i].length > 0) {
          // play audio
        }
      }
    }
  }

  if (!roomCommandFound) {
    switch(command) {
      /*
      case "gehe":
        var room = getObject(input)      
        player.currentRoom = room
        player.save()
        chat(socket, {name: "System"}, player.name + " hat den Raum verlassen.", "everyone else") // todo only to people in room
        chat(socket, {name: "System"}, "Du verlässt den Raum...", "sender") // todo get response from db
        explore(socket, player, null)
        break
      // todo: support alle command from room
      case "bot":
        player.state = "bot"
        player.save()
        botChat(socket, player, null)  
        break
      */
      case "say":
        chat(socket, player, getObject(input), "everyone")
        break
      case "restart":
        // todo: make sure user really wants this
        chat(socket, {name: "System"}, "restarting game...", "sender")
        intro(socket, player, null)
        break
      default:
        chat(socket, {name: "System"}, "unsupported command", "sender")
    }
  }

}

// handle bot chat
function botChat(socket, player, input) {
  
  if(!input) {
    // todo: display general intro to bot
  }
  
  // todo: check for exit keyword
  var command = getCommand(input)
  if(command == "exit") {
    player.state = "world"
    player.save()
    explore(socket, player, null)
    return
  }
    
  // cleverscript
  Cleverscript.talkToBot(process.env.cleverAPIKey, input, player.botState, joke, function(data) {
    chat(socket, {name: "Bot"}, data.output, "sender")
    player.botState = data.cs
    player.save()
    if(data.newjoke_other) {
      // just for testing, todo: manage bot variables
      joke = data.newjoke_other
    }
  })
  
}

/* expose functionality */
module.exports = function (io) {

  // client connects
  io.sockets.on('connection', function (socket) {

    // client detects player action
    socket.on('player-action', function (data) {            

      // check if player exists
      Player.findOne({ uuid: data.uuid }, function(err, player) {
        if(err) return handleError(err)

        if(!player) {
          // no player yet, create one
          player = new Player({ uuid: data.uuid }) // use data as name
          player.state = "welcome"
          player.save()
          intro(socket, player, null)
        } else {
          // check player status and hand off to different parsers
          switch(player.state) {
            case "world": 
              explore(socket, player, data.input)
              break
            case "bot":
              botChat(socket, player, data.input)  
              break
            default:
              intro(socket, player, data.input)
          }
        }
      })      
    })

  })
}