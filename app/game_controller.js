/* variable declarations */

var mongoose = require('mongoose')
var Player = mongoose.model('Player')

var Util = require('./util.js')
var World = require('./world_controller.js')
var Bots = require('./bot_controller.js')
var Intro = require('./intro_controller.js')

/* expose functionality */
module.exports.init = function (io) {

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

          Intro.handleInput(socket, player, null)

        } else {

          if(data.firstPlayerAction) {
            if(player.state = "bot") {
              Bots.leaveBot(player)
            }
          }

          // check player status and hand off to different parsers
          switch(player.state) {
            case "world": 
              World.handleInput(socket, player, data.input)
              break
            case "bot":
              console.log(player.bots)
              Bots.handleInput(socket, player, data.input)  
              break
            default:
              Intro.handleInput(socket, player, data.input)
          }
        }
        // connect sockets and players (player can have several sockets)
        socket.set("uuid", player.uuid)
      })      
    })

  })
}