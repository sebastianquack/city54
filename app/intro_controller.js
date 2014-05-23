/* variable declarations */

var Util = require('./util.js')
var World = require('./world_controller.js')

var RegexJump = /^(spring|sprung|springe)?[\s!\.]*$/i

// handle introduction
var handleInput = function(socket, player, input) {
  
  switch(player.state) {
  case "welcome":
    Util.write(socket, player, {name: "System"}, "Auf den ersten Blick liegt die Stadt einfach da, nicht friedlich und doch stumm, ein riesiges Raumschiff, das gelandet ist, um von hier aus die Welt zu erobern. Die gläsernen Hallen und weißen Monolithen, die vielen Villages und Grünflächen sehen aus, als wüßten sie von nichts. Luftschlitten jagen leise zischend hin und her.", "sender")
    if (player.name == "") player.name = "Du"
    Util.write(socket, player, {name: "Flugcomputer"}, "Wie heißt du?", "sender")
    player.state = "name"
    player.save()
    break

  case "name": 
    player.name = input
      // reflect player input back to player
    Util.write(socket, player, player, input , "sender") 
    player.state = "jump"
    player.save()
    Util.write(socket, player, {name: "Flugcomputer"}, "Danke! Und jetzt... spring!", "sender")
    Util.write(socket, player, {name: "System"}, Util.linkify("Du schaust nach unten und zögerst. [Springst du?|springe]"), "sender")
    break
    
  case "jump":
    if(!input) input = ""
    if(input.search(RegexJump) != -1) { 
      Util.write(socket, player, {name: "System"}, "Du lässt dich aus der offenen Luke in die Tiefe fallen... schnell ziehst du die Reißleine. Der Fallschirm geht auf. Du landest in...", "sender")
    } else {
      Util.write(socket, player, {name: "System"}, "Brutal stößt dich die Stewardess durch die offene Luke in die Tiefe... verzweifelt suchst du nach der Reißleine und ziehst. Der Fallschirm geht auf. Du landest in...", "sender")            
    }
    randomRoom = World.rooms[Math.floor(Math.random()*World.rooms.length)]
    player.setRoom(randomRoom, socket)
    console.log("random room " + randomRoom + " -> " + player.currentRoom)
    player.state = "world"
    player.save()
    World.handleInput(socket, player, null)
    break
  }
}

/* expose functionality */
module.exports.handleInput = handleInput
