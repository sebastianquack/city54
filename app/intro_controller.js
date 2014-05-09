/* variable declarations */

var Util = require('./util.js')
var World = require('./world_controller.js')

// handle introduction
var handleInput = function(socket, player, input) {
  
  switch(player.state) {
    case "name": 
      player.name = input
      Util.write(socket, {name: "System"}, "Danke! Du springst aus dem Flugzeug, öffnest den Fallschirm und landest in...", "sender")
      randomRoom = World.rooms[Math.floor(Math.random()*World.rooms.length)]
      player.setRoom(randomRoom, socket)
      console.log("random room " + randomRoom + " -> " + player.currentRoom)
      player.state = "world"
      player.save()
      World.handleInput(socket, player, null)
      break
    default:
      Util.write(socket, {name: "System"}, "Hallo! Du bist in einem Flugzeug und fliegst über das Ruhrgebiet. Es ist 2044. Wie heißt du?", "sender")
      player.state = "name"
      player.save()
      break
  }
}

/* expose functionality */
module.exports.handleInput = handleInput
