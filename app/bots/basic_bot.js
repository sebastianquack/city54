var FuzzySet = require('fuzzyset.js')
var Util = require('../util.js')

/* variable declarations */

var RegexBye = /^(exit|ciao|tschüss|tschüssikowski|bye|bye bye|auf wiedersehen|wiedersehen)?[\s!\.]*$/i
var RegexYes = /^(ja|ok|yup|jaa|yo|yep|genau|ja)?[\s!\.]*$/i
var RegexNo = /^(nein|no|nö|nee|ne)?[\s!\.]*$/i

/* function declarations */

// handle user input
var handleInput = function(bot, player, input, callback, prefix) {

  if(prefix == undefined) prefix = ""
  var output = {answer: "", abort: null, bot: bot}

  // preprocess user input
  if(input) {
    // check if user wants to exit conversation
    if (input.search(RegexBye) != -1) {
      output.answer = "Tschüss!"
      output.abort = 'player'
      callback(output)
    }
  }
  
  console.log("bot state: " + bot.playerInfo[player.uuid].state)

  // find out how bot reacts according to state of conversation
  switch(bot.playerInfo[player.uuid].state) {
    case "":
      // check if bot knows player's name
      if(bot.playerInfo[player.uuid].playerName) {
        bot.setState(player, "greeting")
      } else {
        bot.setState(player, "ask_name")
      }
      handleInput(bot, player, input, callback, prefix) 
      return
      break

    case "ask_name": 
      output.answer = "Hallo, ich bin " + bot.globalVariables.botname + "! Wie heißt du?"
      bot.setState(player, "get_name")
      break
    
    case "get_name":
      bot.playerInfo[player.uuid].playerName = input
      output.answer = "Schön dich, kennenzulernen, " + input + "! Und, was gibt's Neues?"
      bot.setState(player, "check_keyphrase")
      break

    case "greeting":  
      output.answer = "Schön dich wiederzusehen, " + 
      Util.capitaliseFirstLetter(bot.playerInfo[player.uuid].playerName) + "! Und, was gibt's Neues?"
      bot.setState(player, "check_keyphrase")
      // todo: ask how quest is going if there is one?         
      break
      
    case "check_keyphrase":
      var quests = player.getActiveQuestsToBot(bot.name) // get all active quests leading to this bot

      if(quests.length > 0) {

        bot.setState(player, "ask_content") //default option, in case nothing matches
        
        var messages = []
        quests.forEach(function(quest) {
          messages.push(quest.message.text)
        })
        var fuzzy = FuzzySet(messages)        
        var fuzzyResult = fuzzy.get(input) // fuzzy comparison
                
        if(fuzzyResult) {
          
          // determine the best match
          var bestMatchIndex = -1
          fuzzyResult.forEach(function(result, index) {
            if(result[0] > 0.5) {
              if(bestMatchIndex != -1) {
                if(result[0] > fuzzyResult[bestMatchIndex][0]) {
                  bestMatchIndex = index
                }
              } else {
                bestMatchIndex = index
              }
            }
          })
          
          if(bestMatchIndex != -1) { 
            bot.playerInfo[player.uuid].currentQuest = quests[bestMatchIndex] // save the current quest
            bot.setState(player, "ask_sender_confirmation")
          } 
        }
        
      } else { // there is no quest leading to this bot
        bot.setState(player, "offer_quest") // all is set to create a relationship and send user on a quest
      } 
      handleInput(bot, player, input, callback) 
      return
      break
      
    case "ask_sender_confirmation":
      // respond to message type
      switch(bot.playerInfo[player.uuid].currentQuest.message.type) {
        case "witz":
          output.answer = "Hahahahaha!"
          break
        case "anmachspruch":
          output.answer = "Mmm..."
          break
        case "kompliment":
          output.answer = "Ohh, danke!"
          break
        default:
          output.answer = "Was??"
          break
      }      
      var fromBot = bot.playerInfo[player.uuid].currentQuest.fromBot
      output.answer += " Hat dir " + Util.capitaliseFirstLetter(fromBot) + " aus " + bot.playerInfo[player.uuid].currentQuest.fromPlace + " gesagt, dass du mir das sagen sollst?"
      
      bot.setState(player, "get_sender_confirmation")
      break
      
    case "get_sender_confirmation":
      if(input.search(RegexYes) != -1) {
        // todo: respond to message type & relationship
        prefix = "Puuuh. Das ist ja was. Danke!"
        
        player.resolveQuest(bot.playerInfo[player.uuid].currentQuest)
        bot.playerInfo[player.uuid].currentQuest = null
        // todo: update relationship
                
        bot.setState(player, "offer_quest")
        handleInput(bot, player, input, callback, prefix)
        return
      } 
      else if(input.search(RegexNo) != -1) {
        // todo: respond to message type
        prefix = "Ach soo... dann ist das ja nicht so wichtig."
        bot.setState(player, "ask_content")
        handleInput(bot, player, input, callback, prefix)
        return
      }
      else {
        output.answer = "Bitte rede mal Klartext. Ja oder nein?"
        bot.setState(player, "get_sender_confirmation")        
      }
      break
      
    case "ask_content":
      // todo: ask for different message types
      switch(Math.floor(Math.random() * 4)) {
        case 0: 
          output.answer = "Sag mal, kennst du lustige Witze? Kannst du mir einen sagen?"
          bot.playerInfo[player.uuid].currentMessageType = 'witz'
          break
        case 1: output.answer = "Sag mal, kennst du sexy Anmachsprüche? Kannst du mir einen sagen?"
          bot.playerInfo[player.uuid].currentMessageType = 'anmachspruch'
          break
        case 2: output.answer = "Sag mal, kennst du fiese Beleidigungen? Kannst du mir eine sagen?"
          bot.playerInfo[player.uuid].currentMessageType = 'beleidigung'
          break
        default: output.answer = "Sag mal, kennst du romantische Komplimente? Kannst du mir eins sagen?"
          bot.playerInfo[player.uuid].currentMessageType = 'kompliment'
      }
      bot.setState(player, "get_content")
      break

    case "get_content":
      if(input.search(RegexYes) != -1) {
        output.answer = "Ok, ich bin ganz Ohr!" 
        bot.setState(player, "get_content")
      } 
      else if(input.search(RegexNo) != -1) {
        output.answer = "Ok, trotzdem danke! Bis bald!"
        output.abort = 'bot'         
      }
      else {
        if(!bot.globalVariables.messages) {
          bot.globalVariables.messages = []
        }
        bot.globalVariables.messages.push({
          text: Util.capitaliseFirstLetter(input), 
          type: bot.playerInfo[player.uuid].currentMessageType,
          author: player.name
        })
        prefix = "Danke!"
        bot.setState(player, "offer_quest")        
        handleInput(bot, player, input, callback, prefix)
        return
      }
      break
      
    case "offer_quest":

      if(!bot.globalVariables.messages) bot.globalVariables.messages = [] 
      if(bot.globalVariables.messages.length < 4) { 

        bot.setState(player, "ask_content") 
        handleInput(bot, player, input, callback, prefix)
        return

      } else if(player.getActiveQuestsFromBot(bot.name).length > 0) {
        
        output.answer = "Ich hoffe du hast meinen Auftrag nicht vergessen... Tschüss!"
        output.abort = 'bot'
        
      } else {
        
        // pick a random message      
        var randomMessage = bot.globalVariables.messages[Math.floor(Math.random() * bot.globalVariables.messages.length)]
      
        if(bot.relationships.length > 0) { // bot already has relationships
          // pick a random bot, todo: branch on relationship status
          var randomRelationship = bot.relationships[Math.floor(Math.random() * bot.relationships.length)]
          bot.playerInfo[player.uuid].currentQuest = {
            questGiver: bot.name, 
            questGiverPlace: Util.capitaliseFirstLetter(bot.room.split('/')[0]), 
            fromBot: bot.name, 
            fromPlace: Util.capitaliseFirstLetter(bot.room.split('/')[0]), 
            toBot: randomRelationship.bot, 
            toPlace: randomRelationship.place, 
            message: randomMessage, 
            status: 'active'
          }

          bot.setState(player, "get_quest_confirmation")
          output.answer = "Hey, kannst du nach " + randomRelationship.place + " gehen und " + Util.capitaliseFirstLetter(randomRelationship.bot) + " eine Nachricht von mir übermitteln?"

        } else { // bot needs to create a relationship first        
          // pick a random bot
          bot.findRandomOtherBot(function(randomOtherBot) {                    
            if(randomOtherBot) {
              var newRelationship = {
                bot: randomOtherBot.name, 
                place: Util.capitaliseFirstLetter(randomOtherBot.room.split('/')[0]), 
                level: 1 
              }
              bot.relationships.push(newRelationship)          
              bot.playerInfo[player.uuid].currentQuest = {
                questGiver: bot.name, 
                questGiverPlace: Util.capitaliseFirstLetter(bot.room.split('/')[0]), 
                fromBot: bot.name, 
                fromPlace: Util.capitaliseFirstLetter(bot.room.split('/')[0]), 
                toBot: newRelationship.bot, 
                toPlace: newRelationship.place,
                message: randomMessage, 
                status: 'active'
              }

              bot.setState(player, "get_quest_confirmation")
              output.answer = "Hey, kannst du nach " + newRelationship.place + " gehen und " + Util.capitaliseFirstLetter(randomOtherBot.name) + " eine Nachricht von mir übermitteln?"
              output.bot = bot // pass updated bot into callback
              callback(output)
            
            } else {
              bot.setState(player, "ask_content") // in case no other bot was found
              handleInput(bot, player, input, callback, prefix)
            }
          }) 
          return
        }
      }
      
      break
      
    case "get_quest_confirmation":
      if(input.search(RegexYes) != -1) {
        player.quests.push(bot.playerInfo[player.uuid].currentQuest)
        output.answer = "Super, die Nachricht ist: '" + bot.playerInfo[player.uuid].currentQuest.message.text + "' " 
        if(bot.playerInfo[player.uuid].currentQuest.message.author == player.name) {
          output.answer += "Von dir weiß ich ja, dass das "
        } else {
          output.answer += bot.playerInfo[player.uuid].currentQuest.message.author + " hat mir gesagt, dass das "
        }
        switch(bot.playerInfo[player.uuid].currentQuest.message.type) {
          case "witz":
            output.answer += "ein lustiger Witz ist!"
            break
          case "anmachspruch":
            output.answer += "ein sexy Anmachspruch ist!"
            break
          case "kompliment":
            output.answer += "ein romantisches Kompliment ist!"
            break
          default:
            output.answer += "eine fiese Beleidigung ist!"
            break
        }
        output.answer += " Und Danke, dass du das für mich machst! Gute Reise!"
        output.abort = 'bot'
      } 
      else if(input.search(RegexNo) != -1) {
        output.answer = "Schade... aber ok, du hast wahrscheinlich viel zu tun. Tschüss!" 
        bot.playerInfo[player.uuid].currentQuest = null
        output.abort = 'bot'
      }
      else {
        output.answer = "Bitte rede mal Klartext. Das ist wichtig für mich! Ja oder nein?"
        bot.setState(player, "get_sender_confirmation")        
      }
      break
            
    default:
      output.answer = "Ich weiß nicht, was heute mit mir los ist... sprich lieber nicht mit mir! Tschüss!"
      output.abort = 'bot'
      bot.setState(player, "")
  }  
  
  output.bot = bot // pass updated bot into callback
  output.answer = prefix + " " + output.answer
  callback(output)
}

/* expose functionality */

module.exports.handleInput = handleInput
