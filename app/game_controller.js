/* variable declarations */

var mongoose = require('mongoose')
var Player = mongoose.model('Player')
var ChatItem = mongoose.model('ChatItem')
var Bot = mongoose.model('Bot')
var Cleverscript = require('./apis/cleverscript')
var Spreadsheets = require('./apis/google_spreadsheets')
var rooms = ['witten', 'oberhausen', 'gelsenkirchen','dortmund']
var RegexBotExit = /^(exit|ciao|tschüss|tschüssikowski|bye|bye bye|auf wiedersehen|wiedersehen)?[\s!\.]*$/i
var RegexWoBinIch = /^(wo bin ich|wobinich|wo|umschauen|schaue um|schaue dich um|schau um|schau dich um|schaue$)/i
var RegexWerBinIch = /^(wer bin ich|werbinich|ich|schau dich an)/i
var RegexWerIstDa = /^(wer ist da|werbistda|wer|wer ist anwesend)/i
var worldVariables = []

// helper extensions to javascript string prototype, checks if string starts or ends with another string
if (typeof String.prototype.endsWith != 'function') {
  String.prototype.endsWith = function (str){
    return this.slice(-str.length) == str;
  };
}

if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.slice(0, str.length) == str;
  };
}

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
function chat(socket, player, value, mode, type) {
  var chat_item = new ChatItem({ player_uuid: player.uuid, player_name: player.name, value: value, type: type })
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

// get a list of active player in a room
function getPlayersInRoom(socket, room, callback) {

  uuids = []
  roomSockets = io.sockets.clients(room)

  var queryPlayers = function (uuids){
    Player.find( { uuid: { $in: uuids } } , function(err, roomPlayers) {
      if(err) return handleError(err)

      callback(roomPlayers)
    })
  } 

  for (i in roomSockets) {
    //if (uuids.indexOf(roomSockets[i]) == -1) 
    roomSockets[i].get("uuid", function(err, uuid) {
      if (uuid == undefined) return
      else uuids.push(uuid)
      if (i >= roomSockets.length-1) queryPlayers(uuids)
    })
  }
}

function announceRoomPlayers(socket, player) {
    getPlayersInRoom(socket, player.currentRoom, function(roomPlayers) {
      playerNames = []
      for (i in roomPlayers) { 
        if (player.name != roomPlayers[i].name) 
          playerNames.push(roomPlayers[i].name) 
      }    
      switch(playerNames.length) {
        case 0:  return;
        case 1:  var list= playerNames[0] + " ist"; break;
        case 2:  var list= playerNames[0] + " und " + playerNames[1] + " sind"; break;
        default: var list= playerNames.splice(0,-1).join(", ") + " und " + playerNames[playerNames.length-1] + " sind"
      }
      chat(socket, {name: "System", currentRoom: player.currentRoom}, linkify("[" + list + " auch hier.|sage Hallo]"), "sender")
    })
}

// parse WorldVariable String
function parseWV(string) {
  parts = string.split("=")
  // TODO error handling
  return { name: parts[0], value: parts[1] }
}

// check WorldVariable
function checkWV(wv) {
  if (wv == undefined) return true // no object given
  if (worldVariables[wv.name] == undefined) { // wv does not exist
    console.log("init WV " + wv.name + "=" + wv.value)
    setWV(wv) // init at first appearance
    return true
  }
  else return (worldVariables[wv.name] == wv.value)
}

// set WorldVariable
function setWV(vw) {
  worldVariables[vw.name] = vw.value
}

// parse and execute room commands
function processRoomCommand(socket, player, command, object) {
  data = player.currentRoomData;
  roomCommandFound = false;
  if (data == undefined) return false
  var reply = ""
  for (i in data.command) {

    var condition = null

    // get world variable (condition)
    if (data.condition != undefined && data.condition[i].length > 0) {
      var condition = parseWV(data.condition[i])
    }

    if (
      data.command[i].split("|").indexOf(command) != -1
      && data.object[i].split("|").indexOf(object) != -1
      && (condition == null || checkWV(condition)) // check condition
    ) { // TODO: SYNONYMS
      
      roomCommandFound = true

      // effect
      if (data.effect != undefined && data.effect[i].length > 0) {
        effect = parseWV(data.effect[i])
        setWV(effect)
      }   

      // collect reply
      reply = reply + linkify(data.text[i]) + " "

      // announce action publicly
      if (data.announcement != undefined && data.announcement[i].length > 0) {
        chat(socket, {name: "System", currentRoom: player.currentRoom}, player.name + " " + linkify(data.announcement[i]), "everyone else") // todo only to people in room
      } 

      // leave room
      if (data.exit != undefined && data.exit[i].length > 0) {
        //chat(socket, {name: "System", currentRoom: player.currentRoom}, player.name + " hat den Raum verlassen.", "everyone else") // todo only to people in room
        player.setRoom (data.exit[i], socket)
        player.currentRoomData = {}
        player.save()
        //if (reply == "") chat(socket, {name: "System"}, "Du verlässt den Raum...", "sender") // todo get response from db        
        explore(socket, player, null)
      }  

      // enter bot
      if (data.bot != undefined && data.bot[i].length > 0) {
        player.state = "bot"
        player.currentBot = data.bot[i]
        console.log("entering botchat " + player.currentBot)
        player.save()
        botChat(socket, player, null)
      }

      // play audio
      if (data.audio != undefined && data.audio[i].length > 0) {
        // play audio
      }
    }
  }
  // send reply
  if (reply != "") chat(socket, {name: "System"}, reply, "sender")

  return roomCommandFound
}
/* react to to player actions in different situations */

// handle introduction
function intro(socket, player, input) {
  
  switch(player.state) {
    case "name": 
      player.name = input
      chat(socket, {name: "System"}, "Danke! Du springst aus dem Flugzeug, öffnest den Fallschirm und landest in...", "sender")
      randomRoom = rooms[Math.floor(Math.random()*rooms.length)]
      player.setRoom(randomRoom, socket)
      console.log("random room " + randomRoom + " -> " + player.currentRoom)
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
      player.setRoom(player.currentRoom, socket)
      //if (player.currentRoom.split("/")[0] != player.previousRoom.split("/")[0]) { // city changed
        d = new Date(new Date().setFullYear(2044))
        chat(socket, {name: "System"}, player.currentRoom.replace("/",", ") + " — " +d.getDate()+"."+d.getMonth()+"."+d.getFullYear()+", "+d.getHours()+":"+("00" + d.getMinutes()).slice(-2), "sender", "chapter")
      //}
      chat(socket, {name: "System", currentRoom: player.currentRoom}, player.name + " kommt.", "everyone else")
      player.currentRoomData = data;
      player.save()
      processRoomCommand(socket, player, "base", "")
      announceRoomPlayers(socket, player)
    }     
    Spreadsheets.loadRoom(player.currentRoom, roomEntered)
    return
  }

  var command = getCommand(input)
  var object = getObject(input)

  if (command != "base") {
    roomCommandFound = processRoomCommand(socket, player, command, object)
  }

  if (!roomCommandFound) {

    // wo bin ich?
    if (input.search(RegexWoBinIch) != -1) {
      processRoomCommand(socket, player, "base", "")
      announceRoomPlayers(socket, player)
      return
    }

    // wer bin ich?
    if (input.search(RegexWerBinIch) != -1) {
      chat(socket, {name: "System"}, player.name, "sender")
      return
    }

    // wer ist da?
    if (input.search(RegexWerIstDa) != -1) {
      announceRoomPlayers(socket, player)
      return
    }

    switch(command) {
      case "sage":
        chat(socket, player, getObject(input), "everyone else and me")
        break
      case "restart":
        // todo: make sure user really wants this
        chat(socket, {name: "System"}, "restarting game...", "sender")
        intro(socket, player, null)
        break
      case "taxi":
        player.setRoom (object, socket)
        player.currentRoomData = {}
        player.save()
        explore(socket, player, null)
        break
      default:
        //chat(socket, {name: "System"}, command + " " + object + "? Das geht so nicht.", "sender")
        if (!object) var apologies = (command + "en").replace(/ee/,"e") + " nicht möglich."
        else var apologies = object + " lässt sich nicht " + (command + "en").replace(/ee/,"e") + "."
        chat(socket, {name: "System"}, apologies, "sender", "error")
    }
  }

}

// handle bot chat
function botChat(socket, player, input) {
  
  var command = getCommand(input)
  if(typeof command == "string" && command.search(RegexBotExit) != -1) { // abort bot session
    player.state = "world"
    player.bots[player.currentBot].state = null // reset bot state for this player
    player.markModified('bots');
    player.save()
    explore(socket, player, null)
    return
  }
    
  // look up the global bot object
  Bot.findOne( { id: player.currentBot } , function(err, bot) {
    if(err) return handleError(err)   
    if(!bot) { // if bot hasen't been created, create a new one
      bot = new Bot({ id: player.currentBot })
      bot.save()
    }
     
    // call cleverscript with player and bot and process result
    Cleverscript.talkToBot(process.env.cleverAPIKey, player, bot, input, function(data) {
      console.log("data object sent back by cleverscript:")
      console.log(data)
      
      chat(socket, {name: player.currentBot}, data.output, "sender") // inform the player what the bot said

      if(player.bots[player.currentBot] == undefined)
        player.bots[player.currentBot] = {} // in case bots object isn't set yet
      if(player.bots[player.currentBot].variables == undefined)
        player.bots[player.currentBot].variables = {} // in case variables object isn't set yet        
      player.bots[player.currentBot].state = data.cs // store the state variable

      // save bot variables    
      for (var key in data) {    
        
        switch(key) {
          
        // global bot variables
        case "botname_other": 
          //bot.variables[key] = data[key]
          break
        case "joke_other": 
          bot.variables[key] = data[key]
          break
        
        // player specific bot variables
        case "playername_other": 
          player.bots[player.currentBot].variables[key] = data[key]
          break
        
        // check if bot kicked player out of conversation
        case 'bot_abort':
          if(data[key] == 1) {
            player.state = "world" // send player back into world
            player.bots[player.currentBot].state = null // reset bot state for this player
          }
        }
      
      }
  
      player.markModified('bots');
      player.save()
      bot.markModified('variables');
      bot.save()
      
      console.log(player.bots)
      console.log(bot)      
      
      if(player.state == 'world') {
        explore(socket, player, null) 
      }
      
    })

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
              console.log(player.bots)
              botChat(socket, player, data.input)  
              break
            default:
              intro(socket, player, data.input)
          }
        }
        // connect sockets and players (player can have several sockets)
        socket.set("uuid", player.uuid)
      })      
    })

  })
}