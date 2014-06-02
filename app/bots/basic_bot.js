/* variable declarations */

var RegexBye = /^(exit|ciao|tschüss|tschüssikowski|bye|bye bye|auf wiedersehen|wiedersehen)?[\s!\.]*$/i
var RegexYes = /^(ja|jaa|yo|yep|genau|ja)?[\s!\.]*$/i
var RegexNo = /^(nein|no|nö|nee|ne)?[\s!\.]*$/i

/* function declarations */

// handle user input with prefix
var handleInput = function(bot, player, input, prefix) {
  var output = handleInput(bot, player, input)
  output.answer = prefix + " " + output.answer
  return output 
}

// handle user input
var handleInput = function(bot, player, input) {
   
  var output = {answer: "", abort: false, bot: bot}
  var prefix = ""

  // preprocess user input
  if(input) {

    // check if user wants to exit conversation
    if (input.search(RegexBye) != -1) {
      output.answer = "Tschüss!"
      output.abort = true
      return output
    }
  }

  // find out how bot reacts according to state of conversation
  switch(bot.playerInfo[player.uuid].state) {
    case "":
      // add intro depending on love interest status
      if(bot._love_interest) {
        prefix = bot._love_interest.name + " liebt mich, " + bot._love_interest.name + " liebt mich nicht... oh hallo! Ich hab dich gar nicht gesehen."
      }
      // check if bot knows player's name
      if(bot.playerInfo[player.uuid].playerName) {
        bot.setState(player, "greeting")
      } else {
        bot.setState(player, "ask_name")
      }
      output = handleInput(bot, player, input, prefix)
      break

    case "ask_name": 
      output.answer = "Hallo, ich bin " + bot.globalVariables.botname + "! Wie heißt du?"
      bot.setState(player, "get_name")
      break
    
    case "get_name":
      bot.playerInfo[player.uuid].playerName = input
      output.answer = "Schön dich, kennenzulernen, " + input + "!"
      bot.setState(player, "check_keyphrase")
      break

    case "greeting":  
      output.answer = "Schön dich wiederzusehen, " + bot.playerInfo[player.uuid].playerName + "! "
      bot.setState(player, "check_keyphrase")
      break
      
    case "check_keyphrase":
      // todo: check if user input matches keyphrase stored in player mission object
      
      //player.addQuest(bot.name, bot.name, bot._love_interest.name, message)        
        
      // it matched
      //bot.setState(player, "ask_sender_confirmation")
      
      // it didn"t match      
      if(Math.random() >= 0.5) { // todo: or if no messages are saved
        bot.setState(player, "ask_content")
      } else {
        bot.setState(player, "generate_mission")        
      }
      output = handleInput(bot, player, input)
      
      break
      
    case "ask_content":
      output.answer = "Sag mal, kennst du gute Anmachsprüche? Kannst du mir einen sagen?"
      // todo: branch for message type
      bot.setState(player, "get_content")
      break

    case "get_content":
      if(input.search(RegexYes) != -1) {
        output.answer = "Ok, sag mir den Anmachspruch" 
        bot.setState(player, "get_content")
      } 
      else if(input.search(RegexNo) != -1) {
        prefix = "Ok, trotzdem danke! Bis bald!"
        output.abort = true         
      }
      else {
        if(!bot.globalVariables.messages) {
          bot.globalVariables.messages = []
        }
        bot.globalVariables.messages.push({text: input, type: 'anmachspruch'})
        output.answer = "Danke! Kennst du noch einen?"
        bot.setState(player, "get_content")        
      }
      break
      
    case "generate_mission":
      output.answer = "Hey, kannst du nach " + bot._love_interest.room + " gehen und " + bot._love_interest.name + " eine Nachricht von mir übermitteln?"
      bot.setState(player, "get_mission_confirmation")
      break
      
    case "get_mission_confirmation":
      if(input.search(RegexYes) != -1) {
        var message = {text: "Ich bin so einsam wie die letzte Tankstelle vor der Wüste."}
        if(bot.globalVariables.messages) {
          if(bot.globalVariables.messages.length > 0) {
            message = bot.globalVariables.messages[Math.floor(Math.random() * bot.globalVariables.messages.length)].text
          }
        }
        output.answer = "Super, die Nachricht ist: " + message.text + " Danke, dass du das für mich machst! Gute Reise!" 
        output.abort = true
        player.addQuest(bot.name, bot.name, bot._love_interest.name, message)        
      } 
      else if(input.search(RegexNo) != -1) {
        output.answer = "Schade... aber ok, du hast wahrscheinlich viel zu tun. Tschüss!" 
        output.abort = true
      }
      else {
        output.answer = "Bitte rede mal Klartext. Das ist wichtig für mich! Ja oder nein?"
        bot.setState(player, "get_sender_confirmation")        
      }
      break
      
    case "ask_sender_confirmation":
      // todo: respond to message type
      output.answer = "Ohhhh, das berührt mich sehr."
      
      output.answer += "Hat dir " + bot._love_interest.name + " aus " + bot._love_interest.room + " gesagt, dass du mir das sagen sollst?"
      bot.setState(player, "get_sender_confirmation")
      break
      
    case "get_sender_confirmation":
      if(input.search(RegexYes) != -1) {
        // todo: respond to message type & interest_level
        prefix = "Puuuh. Das ist ja was. Ich bin wirklich total verliebt. Danke!"
        bot.setState(player, "generate_mission")
        output = handleInput(bot, player, input, prefix)
      } 
      else if(input.search(RegexNo) != -1) {
        // todo: respond to message type
        prefix = "Schade... von " + bot._love_interest.name + " hätte ich gerne mal wieder was gehört."
        bot.setState(player, "ask_content")
        output = handleInput(bot, player, input, prefix)
      }
      else {
        output.answer = "Bitte rede mal Klartext. Das ist wichtig für mich! Ja oder nein?"
        bot.setState(player, "get_sender_confirmation")        
      }
      break
      
    default:
      output.answer = "Ich weiß nicht, was heute mit mir los ist... sprich lieber nicht mit mir! Tschüss!"
      output.abort = true
      bot.setState(player, "")
  }  
  
  output.bot = bot // pass updated bot back to caller
  return output
}

/* expose functionality */

module.exports.handleInput = handleInput
