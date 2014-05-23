/* variable declarations */

var Util = require('./util.js')

// handle introduction
var handleInput = function(socket, player, input) {

  var menu_response = ""

  switch(input) {

    case "spielanleitung": 
      menu_response = "Spielanleitung"
      break

    case "credits":
      menu_response = "Credits"
      break
            
    case "datenschutz":
      menu_response = "Datenschutzerklärung"
      break

    default:
      menu_response = "Befehl nicht erkannt"
  }
  
  Util.write(socket, player, {name: "System"}, menu_response, "sender")

}

/* expose functionality */
module.exports.handleInput = handleInput
