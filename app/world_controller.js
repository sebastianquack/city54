/* variable declarations */

var mongoose = require('mongoose')
var Player = mongoose.model('Player')
var ChatItem = mongoose.model('ChatItem')

var Util = require('./util.js')
var Bots = require('./bot_controller.js')
var Intro = require('./intro_controller.js')

var rooms = ['witten', 'oberhausen', 'gelsenkirchen','dortmund']
var Spreadsheets = require('./apis/google_spreadsheets')

var RegexWoBinIch = /^(wo bin ich|wobinich|wo|umschauen|schaue um|schaue dich um|schau um|schau dich um|schaue$)/i
var RegexWerBinIch = /^(wer bin ich|werbinich|ich|schau dich an)/i
var RegexWerIstDa = /^(wer ist da|werbistda|wer|wer ist anwesend)/i
var worldVariables = []

/* function declarations */

// parse world descriptions for links
function linkify(text) {
	return text.replace(/\[(.*?)\|(.*?)\]/g,'<b data-command="$2">$1</b>')
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
      Util.write(socket, {name: "System", currentRoom: player.currentRoom}, linkify("[" + list + " auch hier.|sage Hallo]"), "sender")
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
        Util.write(socket, {name: "System", currentRoom: player.currentRoom}, player.name + " " + linkify(data.announcement[i]), "everyone else") // todo only to people in room
      } 

      // leave room
      if (data.exit != undefined && data.exit[i].length > 0) {
        enterRoom(player, data.exit[i], socket)
      }  

      // enter bot
      if (data.bot != undefined && data.bot[i].length > 0) {
        player.state = "bot"
        player.currentBot = data.bot[i]
        console.log("entering botchat " + player.currentBot)
        player.save()
        Bots.handleInput(socket, player, null)
      }

      // play audio
      if (data.audio != undefined && data.audio[i].length > 0) {
        // play audio
      }
    }
  }
  // send reply
  if (reply != "") Util.write(socket, {name: "System"}, reply, "sender")

  return roomCommandFound
}

// handle world exploration
var handleInput = function(socket, player, input) {
  
  if(!input) {
    var roomEntered = function(data){
      player.setRoom(player.currentRoom, socket)
      //if (player.currentRoom.split("/")[0] != player.previousRoom.split("/")[0]) { // city changed
        d = new Date(new Date().setFullYear(2044))
        Util.write(socket, {name: "System"}, player.currentRoom.replace("/",", ") + " — " +d.getDate()+"."+d.getMonth()+"."+d.getFullYear()+", "+d.getHours()+":"+("00" + d.getMinutes()).slice(-2), "sender", "chapter")
      //}
      Util.write(socket, {name: "System", currentRoom: player.currentRoom}, player.name + " kommt.", "everyone else")
      player.currentRoomData = data;
      player.save()
      processRoomCommand(socket, player, "base", "")
      announceRoomPlayers(socket, player)
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
      Util.write(socket, {name: "System"}, player.name, "sender")
      return
    }

    // wer ist da?
    if (input.search(RegexWerIstDa) != -1) {
      announceRoomPlayers(socket, player)
      return
    }

    switch(command) {
      case "warp":
        var target = object + "/" + object
        console.log(target)
        enterRoom(player, target, socket)
        break
      case "restart":
        // todo: make sure user really wants this
        Util.write(socket, {name: "System"}, "restarting game...", "sender")
        player.state = "welcome"
        player.save()
        Intro.handleInput(socket, player, null)
        break
      default:
        Util.write(socket, player, input, "everyone else and me")

        //if (!object) var apologies = (command + "en").replace(/ee/,"e") + " nicht möglich."
        //else var apologies = object + " lässt sich nicht " + (command + "en").replace(/ee/,"e") + "."
        //Util.write(socket, {name: "System"}, apologies, "sender", "error")
    }
  }

}


/* expose functionality */
module.exports.rooms = rooms
module.exports.handleInput = handleInput