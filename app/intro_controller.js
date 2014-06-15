/* variable declarations */

var Util = require('./util.js')
var World = require('./world_controller.js')

var mongoose = require('mongoose')
var Player = mongoose.model('Player')

var RegexJump = /^(spring|sprung|springe)?[\s!\.]*$/i
var RegexChatExit = /^(exit|ciao|tschüss|tschüß|tschüssikowski|bye|bye bye|auf wiedersehen|wiedersehen)+[\s!\.]*$/i

// handle introduction
var handleInput = function(socket, player, input) {
  
  switch(player.state) {
  case "welcome":
    Util.write(socket, player, {name: "System"}, "Auf den ersten Blick liegt die Stadt einfach da, nicht friedlich und doch stumm, ein riesiges Raumschiff, das gelandet ist, um von hier aus die Welt zu erobern. Die gläsernen Hallen und weißen Monolithen, die vielen Villages und Grünflächen sehen aus, als wüßten sie von nichts. Luftschlitten jagen leise zischend hin und her.", "socket")
    if (player.name == "") player.name = "Du"
    Util.write(socket, player, {name: "Flugcomputer"}, "Wie heißt du?", "socket")
    player.state = "name"
    player.save()
    break

  case "name":
    Util.write(socket, player, player, input, "socket") // echo player input
    input = Util.lowerTrim(input)
    
    // check if playername exists
    Player.findOne({ name: input, active: true }, function (err, existingPlayer) {
      
      if(existingPlayer) {
    
        // if yes, ask passphrase    
        Util.write(socket, player, {name: "Flugcomputer"}, Util.capitaliseFirstLetter(input) + "... der Name kommt mir bekannt vor. Wie ist deine Geheimparole?", "socket")
        player.name = input
        player.state = "check_passphrase"
        player.save()

      } else {

        // if no, create player
        player.name = input
        player.state = "save_passphrase"
        player.save()      
        Util.write(socket, player, {name: "Flugcomputer"}, "Hallo, " + Util.capitaliseFirstLetter(input) + "! Bitte erfinde jetzt eine Geheimparole, damit ich dich wiedererkenne.", "socket")
      }

    })
    
    break
    
  case "check_passphrase":
    Util.write(socket, player, player, input, "socket") // echo player input
    input = Util.lowerTrim(input)

    Player.findOne({ name: player.name, active: true }, function (err, existingPlayer){

      if(existingPlayer) {
    
        // check if passphrase is correct
        if(existingPlayer.passphrase == input) {

          Util.write(socket, player, {name: "Flugcomputer"}, "Ah, du bist das. Ich bringe dich runter...", "socket")

          // use existingPlayer from now on with this cookie, remove temporary player document
          existingPlayer.uuid = player.uuid
          existingPlayer.save()
          player.remove()

          Util.write(socket, existingPlayer, {name: "System"}, Util.linkify("Der Flugcomputer landet, lässt dich aussteigen und fliegt davon."), "socket")
          World.handleInput(socket, existingPlayer, null)
                  
                    
        } else {

          player.name = "Du"
          player.state = "name"
          player.save()         
          Util.write(socket, player, {name: "Flugcomputer"}, "Du scheinst nicht der " + Util.capitaliseFirstLetter(existingPlayer.name) + ", zu sein, den ich kenne. Bitte nenne dich anders, damit ich nicht durcheinanderkomme. Wie willst du heißen?", "socket")
        }
        
      } else {
        // this shouldn't happen, go back to start
        player.state = "welcome"
        player.save()      
      }

    })
    break
        
  case "save_passphrase":
    Util.write(socket, player, player, input , "socket") // echo player input
    player.passphrase = input
    player.state = "endchat"
    player.save()
    Util.write(socket, player, {name: "Flugcomputer"}, "Alles klar! Merk dir die Parole gut. Und jetzt.. spring! Aber vorher: Sei höflich und beende das Gespräch, indem du dich von mir verabschiedest.", "socket")
    break
    
  case "endchat":
    if(!input) input = ""
    Util.write(socket, player, player, input , "socket") // echo player input

    if(input.search(RegexChatExit) != -1) {     
      player.state = "jump"
      player.save()
      Util.write(socket, player, {name: "System"}, Util.linkify("Du wendest dich vom Flugcomputer ab, schaust nach unten und zögerst. [Springst du?|springe]"), "socket")
    } else {
      Util.write(socket, player, {name: "Flugcomputer"}, "Das sagt mir nichts. Ich kenne nur ciao, tschüss, tschüssikowski, bye bye und auf wiedersehen. Versuch's nochmal!", "socket")      
    }
    break
    
  case "jump":
    if(!input) input = ""
    if(input.search(RegexJump) != -1) { 
      Util.write(socket, player, {name: "System"}, "Du lässt dich aus der offenen Luke in die Tiefe fallen... schnell ziehst du die Reißleine. Der Fallschirm geht auf. Du landest in...", "socket")
    } else {
      Util.write(socket, player, {name: "System"}, "Brutal stößt dich der Roboterarm des Flugcomputers durch die offene Luke in die Tiefe... verzweifelt suchst du nach der Reißleine und ziehst. Der Fallschirm geht auf. Du landest in...", "socket")            
    }
    randomRoom = World.rooms[Math.floor(Math.random() * World.rooms.length)]
    player.setRoom(randomRoom, socket)
    console.log("random room " + randomRoom + " -> " + player.currentRoom)
    player.state = "world"
    player.active = true
    player.save()
    World.handleInput(socket, player, null)
    break
  }
}

/* expose functionality */
module.exports.handleInput = handleInput
