/* variable declarations */

var mongoose = require('mongoose')
var Player = mongoose.model('Player')
var ChatItem = mongoose.model('ChatItem')

var Util = require('./util.js')
var Bots = require('./bot_controller.js')
var Chat = require('./chat_controller.js')
var Intro = require('./intro_controller.js')

var rooms = ['hamm', 'camp lintfort']
var RegexPrivateRooms = "(tretroller|stahlgleiter|mini\-van|kart)$"
var Spreadsheets = require('../apis/google_spreadsheets')

var RegexWoBinIch = /^(wo bin ich|wobinich|wo|umschauen|schaue um|schaue dich um|schau um|schau dich um|schaue$)/i
var RegexWerBinIch = /^(wer bin ich|werbinich|ich$|schau dich an)/i
var RegexWerIstDa = /^(wer ist da|werbistda|wer$|wer ist anwesend)/i
var worldVariables = []

/* function declarations */

// get a list of active player in a room
function getPlayersInRoom(socket, room, callback) {

  uuids = []
  //roomSockets = io.sockets.clients(room)
  roomSockets = io.of('/').in(room).clients;

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

function announceRoomPlayers(socket, player, announceArrival) {
    if (player.currentRoom.search(RegexPrivateRooms) != -1) return // no output in private rooms
    getPlayersInRoom(socket, player.currentRoom, function(roomPlayers) {
      playerNames = []
      for (i in roomPlayers) { 
        if (player.name != roomPlayers[i].name) {
          playerNames.push(roomPlayers[i].name) 
          if (announceArrival) {
            Util.write(socket, player, {name: "System", currentRoom: player.currentRoom}, player.name + Util.linkify(" ist jetzt auch hier. [sprich " + player.name + "]"), "sender", null, roomPlayers[i])
          }
        }
      }    
      switch(playerNames.length) {
        case 0:  return;
        case 1:  var list= playerNames[0] + " ist"; break;
        case 2:  var list= playerNames[0] + " und " + playerNames[1] + " sind"; break;
        default: var list= playerNames.splice(0,-1).join(", ") + " und " + playerNames[playerNames.length-1] + " sind"
      }
      Util.write(socket, player, {name: "System", currentRoom: player.currentRoom}, Util.linkify("[" + list + " auch hier.|sage Hallo]"), "sender")
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

// move player to a room
function enterRoom(player, room, socket) {
  player.setRoom(room, socket)
  player.currentRoomData = {}
  player.save()
  //if (reply == "") chat(socket, {name: "System"}, "Du verlässt den Raum...", "sender") // todo get response from db        
  handleInput(socket, player, null)
}

// enter chat
function enterChat(socket, player, chatRoom, message) {
  player.currentChat = chatRoom
  socket.join(chatRoom)
  player.state = "chat"
  player.save()
  Chat.handleInput(socket, player, message)
}

// parse and execute room commands
function processRoomCommand(socket, player, command, object) {
  data = player.currentRoomData
  roomCommandFound = false
  if (data == undefined) return false
  var reply = ""
  var bot = ""
  var exit = ""
  var effects = []
  for (i in data.command) {
    if (i >= data.command.length) { // prevent a strange bug having to do with cached data object being too large
      console.log("error prevented: player.currentRoomData too large!")
      continue
    }
    if (data.command[i] != undefined) data.command[i] = data.command[i].toLowerCase().trim()
    if (data.object[i] != undefined)  data.object[i] = data.object[i].toLowerCase().trim()

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

      // collect effect
      if (data.effect != undefined && data.effect[i].length > 0) {
        effect = parseWV(data.effect[i])
        effects.push(effect)
      }   

      // collect reply
      reply = reply + Util.linkify(data.text[i]) + " "

      // announce action publicly
      if (data.announcement != undefined && data.announcement[i].length > 0) {
        Util.write(socket, player, {name: "System", currentRoom: player.currentRoom}, player.name + " " + Util.linkify(data.announcement[i]), "everyone else") // todo only to people in room
      } 

      // collect exit
      if (data.exit != undefined && data.exit[i].length > 0) {
        exit = data.exit[i]
      }  

      // enter bot
      if (data.bot != undefined && data.bot[i].length > 0) {
        bot = data.bot[i]
        reply += "Du sprichst jetzt mit " + Util.capitaliseFirstLetter(bot) + ". Verabschiede dich, um das Gespräch zu beenden."
      }

      // play audio
      if (data.audio != undefined && data.audio[i].length > 0) {
        // play audio
      }
    }
  }
  // send reply
  if (reply != "") {
    Util.write(socket, player, {name: "System"}, reply, "sender")
  }

  // set effects
  effects.forEach(function(effect) { setWV(effect) })

  // leave room
  if (exit != "") {
    enterRoom(player, exit, socket)
  }  

  // or enter bot
  else if (bot != "") {
    player.state = "bot"
    player.currentBot = bot
    console.log("entering botchat " + player.currentBot)
    player.save()
    Bots.handleInput(socket, player, null)
  }

  return roomCommandFound
}

// handle world exploration
var handleInput = async function(socket, player, input) {  

  console.log(player);
  console.log(input);
  
  input = Util.lowerTrim(input)

  if(!input) {
    var roomEntered = async function(data){
      if (data == undefined) {
        // no data delivered - send player back to previous room (there is a slight risk of infinite loops here)
        console.log("room " + player.currentRoom + " delivered no data. sending player back to " + player.previousRoom)
        if(player.previousRoom) {
          player.currentRoom = player.previousRoom
          Spreadsheets.loadRoom(player.currentRoom, roomEntered)
        }
        return
      }
      player.setRoom(player.currentRoom, socket)
      await Util.write(socket, player, {name: "System"}, player.currentRoom.replace("/",", ") + " — \time", "sender", "chapter")
      //if (player.currentRoom.search(RegexPrivateRooms) == -1) Util.write(socket, player, {name: "System", currentRoom: player.currentRoom}, player.name + Util.linkify(" ist jetzt auch hier. [sprich " + player.name + "]"), "everyone else")
      player.currentRoomData = data;
      player.inMenu = false
      await player.save()
      processRoomCommand(socket, player, "base", "")
      announceRoomPlayers(socket, player, true)
    }     
    Spreadsheets.loadRoom(player.currentRoom, roomEntered)
    return
  }

  var command = Util.getCommand(input)
  var object = Util.getObject(input)

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
      Util.write(socket, player, {name: "System"}, player.name, "sender")
      return
    }

    // wer ist da?
    if (input.search(RegexWerIstDa) != -1) {
      announceRoomPlayers(socket, player)
      return
    }

    switch(command) {
      case "sage" :
      case "sprich" :
        if(player.inMenu) {
          player.inMenu = false
        }
        player.state = "chat"
        await player.save()
        Util.write(socket, player, {name: "System"}, "Du beginnst zu sprechen. Verabschiede dich, um das Gespräch zu beenden.", "sender")
        if (object) {
          playerOrMessage = Util.getCommand(object)
          var targetPlayer = undefined
          var message = Util.getObject(object)
          getPlayersInRoom(socket, player.currentRoom, function(roomPlayers) {
            for (i in roomPlayers) { 
              if (roomPlayers[i].name == playerOrMessage) {
                targetPlayer = roomPlayers[i]
              }
            }
            // target player found
            if (targetPlayer != undefined) {
              if (message) {
                // enter chat with targetPlayer & message
                //Util.write(socket, targetPlayer, {name: "System"}, player.name + " spricht so zu dir, dass nur du es hören kannst...", "sender")
                //Util.write(socket, player, {name: "System"}, "Du wendest dich " + targetPlayer.name + " zu.", "sender")
                //Util.write(socket, player, player, message, "everyone else", null, targetPlayer )
                enterChat(socket, player, player.currentRoom, object) 
              }
              else {
                // enter chat with targetPlayer
                enterChat(socket, player, player.currentRoom, object) 
              }
            }
            // no target player found
            else {
              // enter chat with room and message
              enterChat(socket, player, player.currentRoom, object) 
            }
          })
        }
        else {
          enterChat(socket, player, player.currentRoom) 
        }
        break
      case "warp":
        var target = object
        enterRoom(player, target, socket)
        break
      case "warpchat":
        var targetBot = object.split(" in ")[0]
        if(targetBot && object.split(" in ").length > 1) {
          player.state = "bot"
          player.currentBot = targetBot
          player.currentRoom = object.split(" in ")[1]
          //player.currentRoomData = {}
          console.log("entering botchat " + player.currentBot)
          player.save(function() {
            Bots.handleInput(socket, player, null)
          })
          
        }
        break

      case "admin":
          switch(object) {
            case "print player":
              Util.write(socket, player, {name: "System"}, player, "sender")
            break
          }
        break
      default:
        //Util.write(socket, player, player, input, "everyone else and me")

        //if (!object) var apologies = (command + "en").replace(/ee/,"e") + " nicht möglich."
        //else var apologies = object + " lässt sich nicht " + (command + "en").replace(/ee/,"e") + "."
        //Util.write(socket, player, {name: "System"}, apologies, "sender", "error")

        if (!object) var apologies = "Du versuchst zu " + (command + "en").replace(/ee/,"e") + ", aber das klappt nicht."
        else var apologies = "Du versuchst, " + object + " zu " + (command + "en").replace(/ee/,"e") + ", aber das klappt nicht."
        Util.write(socket, player, {name: "System"}, apologies, "sender", "error")        
    }
  }

}


/* expose functionality */
module.exports.rooms = rooms
module.exports.handleInput = handleInput