var FuzzySet = require('fuzzyset.js')
var Util = require('../util.js')

/* variable declarations */

var RegexBye = /^(exit|ciao|tschüss|tschüssikowski|bye|bye bye|auf wiedersehen|wiedersehen)?[\s!\.]*$/i
var RegexYes = /^(ja|jaa|yo|yep|genau|ja)?[\s!\.]*$/i
var RegexNo = /^(nein|no|nö|nee|ne)?[\s!\.]*$/i

/* function declarations */

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
        prefix = 
          Util.capitaliseFirstLetter(bot._love_interest.name) + 
          " liebt mich, " + 
          Util.capitaliseFirstLetter(bot._love_interest.name) + 
          " liebt mich nicht... oh hallo! Ich hab dich gar nicht gesehen."
      }
      // check if bot knows player's name
      if(bot.playerInfo[player.uuid].playerName) {
        bot.setState(player, "greeting")
      } else {
        bot.setState(player, "ask_name")
      }
      output = handleInputPrefix(bot, player, input, prefix)
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
      output.answer = "Schön dich wiederzusehen, " + 
      Util.capitaliseFirstLetter(bot.playerInfo[player.uuid].playerName) + "! "
      bot.setState(player, "check_keyphrase")
      // todo: ask how quest is going if there is one?         
      break
      
    case "check_keyphrase":
      var quest = player.getActiveQuestToBot(bot.name) // check if user is already on a quest for this bot
      console.log(quest)
      if(quest != null) {

        var fuzzy = FuzzySet([quest.message.text])        
        var fuzzyResult = fuzzy.get(input) // fuzzy comparison
        
        bot.setState(player, "ask_content") //default
        if(fuzzyResult) {
          if((fuzzy.get(input))[0][0] > 0.5) { 
            bot.setState(player, "ask_sender_confirmation")
          } 
        }
      } else { // there is no quest
        if(!bot.globalVariables.messages || !bot._love_interest) { 
          bot.setState(player, "ask_content") // bot doesn't know any messages or isn't in love: collect 
        } else { 
          if(bot._love_interest) {
            bot.setState(player, "offer_quest") // all set to give quest         
          }
        }
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
        output.answer = "Ok, sag mir den Anmachspruch!" 
        bot.setState(player, "get_content")
      } 
      else if(input.search(RegexNo) != -1) {
        output.answer = "Ok, trotzdem danke! Bis bald!"
        output.abort = true         
      }
      else {
        if(!bot.globalVariables.messages) {
          bot.globalVariables.messages = []
        }
        bot.globalVariables.messages.push({text: Util.capitaliseFirstLetter(input), type: 'anmachspruch'})
        output.answer = "Danke! Kennst du vielleicht noch einen?"
        bot.setState(player, "get_content")        
      }
      break
      
    case "offer_quest":
      output.answer = "Hey, kannst du nach " + Util.capitaliseFirstLetter(bot._love_interest.room.split('/')[0]) + " gehen und " + Util.capitaliseFirstLetter(bot._love_interest.name) + " eine Nachricht von mir übermitteln?"
      bot.setState(player, "get_quest_confirmation")
      break
      
    case "get_quest_confirmation":
      if(input.search(RegexYes) != -1) {
        var message = {text: "Ich bin so einsam wie die letzte Tankstelle vor der Wüste.", type: 'anmachspruch'}
        if(bot.globalVariables.messages) {
          if(bot.globalVariables.messages.length > 0) {
            message = bot.globalVariables.messages[Math.floor(Math.random() * bot.globalVariables.messages.length)]
          }
        }
        output.answer = "Super, die Nachricht ist: '" + message.text + "' Danke, dass du das für mich machst! Gute Reise!" 
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
      
      output.answer += "Hat dir " + Util.capitaliseFirstLetter(bot._love_interest.name) + " aus " + Util.capitaliseFirstLetter(bot._love_interest.room.split('/')[0]) + " gesagt, dass du mir das sagen sollst?"
      bot.setState(player, "get_sender_confirmation")
      break
      
    case "get_sender_confirmation":
      if(input.search(RegexYes) != -1) {
        // todo: respond to message type & interest_level
        prefix = "Puuuh. Das ist ja was. Ich bin wirklich total verliebt. Danke!"
        bot.setState(player, "offer_quest")
        output = handleInputPrefix(bot, player, input, prefix)
      } 
      else if(input.search(RegexNo) != -1) {
        // todo: respond to message type
        prefix = "Schade... von " + Util.capitaliseFirstLetter(bot._love_interest.name) + " hätte ich gerne mal wieder was gehört."
        bot.setState(player, "ask_content")
        output = handleInputPrefix(bot, player, input, prefix)
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

// handle user input with prefix
var handleInputPrefix = function(bot, player, input, prefix) {
  var output = handleInput(bot, player, input)
  output.answer = prefix + " " + output.answer
  return output 
}

/* expose functionality */

module.exports.handleInput = handleInput
