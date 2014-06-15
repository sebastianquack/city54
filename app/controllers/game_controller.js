/* variable declarations */

var mongoose = require('mongoose')
var Player = mongoose.model('Player')

var Util = require('./util.js')
var World = require('./world_controller.js')
var Bots = require('./bot_controller.js')
var Chat = require('./chat_controller.js')
var Intro = require('./intro_controller.js')
var Menu = require('./menu_controller.js')

/* expose functionality */
module.exports.init = function (io) {

  // reset players
  console.log("Resettings Players...")
  Player.update({ online: true }, { $set: { online: false }}, { multi: true }, function() {

    // client connects
    io.sockets.on('connection', function (socket) {

      // client detects player action
      socket.on('player-action', function (data) {    

        // check if player exists
        Player.findOne({ uuid: data.uuid }, function(err, player) {
          if(err) return Util.handleError(err)

          if(!player) {

            // no player yet, create one
            player = new Player({ uuid: data.uuid }) // use data as name
            player.state = "welcome"
            player.save()

          } 

          // connect sockets and players (player can have several sockets)
          socket.set("uuid", player.uuid) // or: add socket id to player (and clean the list up)
          socket.join(player.uuid)
          player.online = true
          player.currentIP = socket.handshake.address.address + ':' + socket.handshake.address.port
          player.save()

          if (player.blocked == true) {
            Util.write(socket, player, {name: "System"}, Util.linkify("Dein Account wurde gesperrt. Bei Fragen hierzu wende dich bitte an /tobias.fritzsche@ringlokschuppen.de/"), "sender")
            return
          }


          if (player.state == "welcome") {
            // new player action
            Intro.handleInput(socket, player, null)
          } else {

            // if client was just reloaded
            if(data.firstPlayerAction) {

              player.inMenu = false
              player.save()
              
              switch(player.state) {
                case "world":
                  break
                case "bot":
                  Bots.leaveBot(player)
                  break
                case "chat":
                  player.previousChat = player.currentChat            
                  player.currentChat = ""
                  player.state = "world"        
                  break      
                default: // reset intro to start
                  player.state = "welcome"
                  player.name = ""
                  player.save()
                  break
              }
            }

            // see if this is a menu event
            if(!Menu.handleInput(socket, player, data.input)) {

              // check player state and hand off to different parsers
              switch(player.state) {
                case "world": 
                  World.handleInput(socket, player, data.input)
                  break
                case "bot":
                  Bots.handleInput(socket, player, data.input)  
                  break
                case "chat":
                  Chat.handleInput(socket, player, data.input)  
                  break              
                default:
                  Intro.handleInput(socket, player, data.input)
              }
            
            }
            
          }

        })
      })

      socket.on('disconnect', function () {
        Util.socketGetPlayer(socket, function(player) {
          player.online = false
          player.save
        })
        // remove socket id from player (and clean the list up)
      });

    })
  })
}