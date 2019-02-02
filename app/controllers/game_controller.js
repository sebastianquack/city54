/* variable declarations */

var mongoose = require('mongoose')
var Player = mongoose.model('Player')

var Util = require('./util.js')
var World = require('./world_controller.js')
var Bots = require('./bot_controller.js')
var Chat = require('./chat_controller.js')
var Intro = require('./intro_controller.js')
var Menu = require('./menu_controller.js')

function getClientIp(req) {
  var ipAddress;
  // Amazon EC2 / Heroku workaround to get real client IP
  var forwardedIpsStr = req.header('x-forwarded-for'); 
  if (forwardedIpsStr) {
    // 'x-forwarded-for' header may return multiple IP addresses in
    // the format: "client IP, proxy 1 IP, proxy 2 IP" so take the
    // the first one
    var forwardedIps = forwardedIpsStr.split(',');
    ipAddress = forwardedIps[0];
  }
  if (!ipAddress) {
    // Ensure getting client IP address still works in
    // development environment
    ipAddress = req.connection.remoteAddress;
  }
  return ipAddress;
}

/* expose functionality */
module.exports.init = function (io) {

  // reset players
  console.log("Resetting Players...")
  Player.update({ online: true }, { $set: { online: false }}, { multi: true }, async function() {

    // client connects
    io.sockets.on('connection', function (socket) {

      // client detects player action
      socket.on('player-action', function (data) {    

        // check if player exists
        Player.findOne({ uuid: data.uuid }, async function(err, player) {
          if(err) return Util.handleError(err)

          if(!player) {

            console.log("player not recognized, creating new player object");

            // no player yet, create one
            player = new Player({ uuid: data.uuid }) // use data as name
            player.state = "welcome"
            await player.save()

          } else {
            console.log("player recognized", player);
          }

          // connect sockets and players (player can have several sockets)
          //socket.set("uuid", player.uuid) // or: add socket id to player (and clean the list up)
          socket.uuid = player.uuid;

          socket.join(player.uuid)
          player.online = true
          
          //console.log("headers " + Object.keys(socket.handshake.headers))
          if(socket.handshake.headers['x-forwarded-for'])
            player.currentIP = socket.handshake.headers['x-forwarded-for']
            //console.log("x-forwarded-for " + socket.handshake.headers['x-forwarded-for'])
          await player.save()
          console.log("player saved");

          if (player.blocked == true) {
            Util.write(socket, player, {name: "System"}, Util.linkify("Dein Account wurde gesperrt. Bei Fragen hierzu wende dich bitte an /max.grafe@ringlokschuppen.de/"), "sender")
            return
          }

          if (player.state == "welcome") {
            // new player action
            Intro.handleInput(socket, player, null)
          } else {

            // if client was just reloaded
            if(data.firstPlayerAction) {

              player.inMenu = false
              await player.save()
              console.log("player saved");
              
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
                  await player.save()
                  break
              }
            }

            // see if this is a menu event

            Menu.handleInput(socket, player, data.input).then((result)=>{
              if(!result) {
                console.log(result);
                console.log(player);

                // check player state and hand off to different parsers
                switch(player.state) {
                  case "world": 
                    console.log("handing over to world controller");
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
            });
          }  
        })
      })

      socket.on('disconnect', async function () {
        Util.socketGetPlayer(socket, async function(player) {
          player.online = false
          await player.save()
        })
        // remove socket id from player (and clean the list up)
      });

    })
  })
}