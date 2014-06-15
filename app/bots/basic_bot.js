var FuzzySet = require('fuzzyset.js')
var Util = require('../util.js')

/* variable declarations */

var RegexBye = /^(exit|ciao|tschüss|tschüssikowski|bye|bye bye|auf wiedersehen|wiedersehen)?[\s!\.]*$/i
var RegexYes = /^(ja|ok|okay|o\.k\.|yup|jaa|yo|yep|genau|ja|klar|sicher|aber klar|aber klar doch)?[\s!\.]*$/i
var RegexNo = /^(nein|no|nö|nee|ne|niemals|never|auf keinen fall)?[\s!\.]*$/i

var openingPhrases = ["", "Und, was gibt's Neues?", "Und, wie sieht's aus?", "Schönes Wetter heute, nicht?"]

/* function declarations */

var pickRandom = function(options) {
  if(options.length > 0)
    return options[Math.floor(Math.random() * options.length)]
  else
    return null
}

function pickRandomProperty(obj) {
    var result;
    var count = 0;
    for (var prop in obj)
        if (Math.random() < 1/++count)
           result = prop;
    return result;
}

var getMessagesOfType = function(bot, player, type) {
  var messages = []
 
  bot.globalVariables.messages.forEach(function(message) {
    if(message.type == type) {
      messages.push(message)
    }  
  })
  
  return messages
}

var messageTypes = ['witz', 'anmachspruch', 'beleidigung', 'kompliment']
var messageRequests = {witz: "Sag mal, kennst du lustige Witze? Kannst du mir einen sagen?", 
  anmachspruch: "Sag mal, kennst du sexy Anmachsprüche? Kannst du mir einen sagen?", 
  beleidigung: "Sag mal, kennst du fiese Beleidigungen? Kannst du mir eine sagen?",
  kompliment: "Sag mal, kennst du romantische Komplimente? Kannst du mir eins sagen?"
}
var moreMessageRequests = {witz: "Kennst noch mehr lustige Witze?", 
  anmachspruch: "Kennst du noch mehr sexy Anmachsprüche?", 
  beleidigung: "Kennst du noch mehr fiese Beleidigungen?",
  kompliment: "Kennst du noch mehr romantische Komplimente?"
}


// handle user input
/*

output answer and wait for user input:

output.answer = "hi"
bot.setState(player, "done")

output answer and go directly to next bot state:

prefix = "hi"
bot.setState(player, "additional things to output")
handleInput(bot, player, input, callback, prefix) 
return


*/
var handleInput = function(bot, player, input, callback, prefix) {

  // some inits to be on the safe side
  if(!bot.globalVariables.messages) bot.globalVariables.messages = [] 
  if(prefix == undefined) prefix = ""
  var output = {answer: "", abort: null, bot: bot}

  // preprocess user input
  if(input) {
    // check if user wants to exit conversation
    if (input.search(RegexBye) != -1) {
      output.answer = "Tschüss!"
      output.abort = 'player'
      callback(output)
      return
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
      output.answer = "Hallo, ich bin " + Util.capitaliseFirstLetter(bot.globalVariables.botname) + "! Wie heißt du?"
      bot.setState(player, "get_name")
      break
    
    case "get_name":
      bot.playerInfo[player.uuid].playerName = input
      output.answer = "Schön dich, kennenzulernen, " + input + "! "      
      output.answer += pickRandom(openingPhrases)        
      bot.setState(player, "check_keyphrase")
      break

    case "greeting":  
      output.answer = "Schön dich wiederzusehen, " + Util.capitaliseFirstLetter(bot.playerInfo[player.uuid].playerName) + "! "
      output.answer += pickRandom(openingPhrases)     
      bot.setState(player, "check_keyphrase")   
      break
              
    case "check_keyphrase":
      bot.setState(player, "prepare_quest") // default option
      
      var quests = player.getActiveQuestsToBot(bot.name) // get all active quests leading to this bot
      console.log(quests)
      if(quests.length > 0) {
        
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
            console.log(result)
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
            quests.forEach(function(q) {
              if(q.message.text == fuzzyResult[bestMatchIndex][1]) {
                bot.playerInfo[player.uuid].currentQuest = q // save the current quest
                bot.setState(player, "ask_sender_confirmation")                
              }
            })
          }
        
        }
        
      } 
      handleInput(bot, player, input, callback) 
      return
      break

    // the bot reviews her relationships and decided what to ask of user      
    case "prepare_quest":

      // see if user is already on a quest form this bot
      var activeQuests = player.getActiveQuestsFromBot(bot.name)
      if(activeQuests.length > 0) {
        output.answer = "Sag mal, hast du " + Util.capitaliseFirstLetter(activeQuests[0].toBot) + " in " + activeQuests[0].toPlace + " schon meine Nachricht überbracht?"
        output.answer += " Wär echt toll, wenn du Folgendes sagen könntest: '" + activeQuests[0].message.text + "'!"
        output.abort = 'bot'
        break
      }

      if(Object.keys(bot.relationships).length > 0) { 
        // bot already has a relationship and can only have one in this model, update here to change
        bot.setState(player, "generate_quest")
        handleInput(bot, player, input, callback, prefix)
        return
        
      } else { // create the bots first relationship
        bot.findRandomOtherBot(function(randomOtherBot) {                    
          if(randomOtherBot) {
            var newRelationship = {
              bot: randomOtherBot.name, 
              place: Util.capitaliseFirstLetter(randomOtherBot.room.split('/')[0]), 
              level: 1 
            }
            bot.relationships[randomOtherBot.name] = newRelationship

            bot.setState(player, "generate_quest")
            handleInput(bot, player, input, callback, prefix)
        
          } else {
            bot.setState(player, "ask_content") // in case no other bot was found
            handleInput(bot, player, input, callback, prefix)
          }
        }) 
        return
      }

    case "generate_quest":

      var randomRelatedBot = pickRandomProperty(bot.relationships)
      var randomRelationship = bot.relationships[randomRelatedBot]
      bot.playerInfo[player.uuid].currentRelationship = randomRelationship
      
      if(randomRelationship.level == 1) {
        output.answer = "Ich würde wirklich gerne " + randomRelationship.bot + " in " + randomRelationship.place + " besser kennenlernen."        
      }
      else if(randomRelationship.level == 2) {
        output.answer = randomRelationship.bot + " aus " + randomRelationship.place + " finde ich echt heiß. Ich bin ein bisschen verliebt."          
      }
      else if(randomRelationship.level > 2) {
        output.answer = randomRelationship.bot + " aus " + randomRelationship.place + " ist meine große Liebe."          
      }
      else if(randomRelationship.level < 1) {
        output.answer = "Ich bin richtig sauer auf " + randomRelationship.bot + " in " + randomRelationship.place + "!!"            
      }
        
      output.answer += " Kannst du mir helfen?"
        
      // create the quest and store it for confirmation
      bot.playerInfo[player.uuid].currentQuest = {
        questGiver: bot.name, 
        questGiverPlace: Util.capitaliseFirstLetter(bot.room.split('/')[0]), 
        fromBot: bot.name, 
        fromPlace: Util.capitaliseFirstLetter(bot.room.split('/')[0]), 
        toBot: randomRelationship.bot, 
        toPlace: randomRelationship.place, 
        message: 'tbd', 
        status: 'active'
      }

      bot.setState(player, "get_quest_confirmation")
      break
      
    case "get_quest_confirmation":
      if(input.search(RegexYes) != -1) {
        
        output.answer = "Toll. "
        var message = null
        
        if(bot.playerInfo[player.uuid].currentRelationship.level == 1) {
          bot.playerInfo[player.uuid].currentMessageType = "witz"
        }
        else if(bot.playerInfo[player.uuid].currentRelationship.level == 2) {
          bot.playerInfo[player.uuid].currentMessageType = "kompliment"
        }
        else if(bot.playerInfo[player.uuid].currentRelationship.level > 2) {
          bot.playerInfo[player.uuid].currentMessageType = "anmachspruch"
        }
        else {
          bot.playerInfo[player.uuid].currentMessageType = "beleidigung"
        }
        messages = getMessagesOfType(bot, player, bot.playerInfo[player.uuid].currentMessageType)
        message = pickRandom(messages)
        
        if(message) {
          bot.playerInfo[player.uuid].currentQuest.message = message
                  
          output.answer += "Kannst du bitte zu " + bot.playerInfo[player.uuid].currentQuest.toBot + " in " + bot.playerInfo[player.uuid].currentQuest.toPlace + " gehen und Folgendes sagen: '"
          output.answer += bot.playerInfo[player.uuid].currentQuest.message.text + "' "
                    
          if(bot.playerInfo[player.uuid].currentQuest.message.author == player.name) {
            output.answer += "Du meintest ja, dass das "
          } else {
            output.answer += bot.playerInfo[player.uuid].currentQuest.message.author + " hat mir gesagt, dass das "
          }
          switch(bot.playerInfo[player.uuid].currentQuest.message.type) {
            case "witz":
              output.answer += "ein lustiger Witz ist... oder kennst du vielleicht noch einen besseren?"
              break
            case "anmachspruch":
              output.answer += "ein sexy Anmachspruch ist... oder kennst du vielleicht noch einen besseren?"
              break
            case "kompliment":
              output.answer += "ein romantisches Kompliment ist... oder kennst du vielleicht noch ein besseres?"
              break
            default:
              output.answer += "eine fiese Beleidigung ist... oder kennst du noch vieleicht ein besseres?"
              break
          }                    
          // let player evaluate content
          bot.setState(player, "get_final_quest_confirmation")
                    
        } else {
          // ask for content
          output.answer += messageRequests[bot.playerInfo[player.uuid].currentMessageType]          
          bot.setState(player, "get_content")        
        }
            
      } 
      else if(input.search(RegexNo) != -1) {
        output.answer = "Schade... aber ok, du hast wahrscheinlich viel zu tun. Tschüss!" 
        bot.playerInfo[player.uuid].currentQuest = null
        bot.playerInfo[player.uuid].currentRelationship = null
        output.abort = 'bot'
      }
      else {
        output.answer = "Bitte rede mal Klartext. Das ist wichtig für mich! Ja oder nein?"
        bot.setState(player, "get_sender_confirmation")        
      }
      break
    
    case "get_final_quest_confirmation":
      if(input.search(RegexNo) != -1) {
        output.answer += "Alles klar. Vielen Dank, dass du das für mich machst! Tschüss!"
        output.abort = 'bot'
        player.quests.push(bot.playerInfo[player.uuid].currentQuest)
      } else if(input.search(RegexYes) != -1) {
        output.answer = "Wirklich? Jezt bin ich gespannt.. schieß los!"         
        bot.setState(player, "get_final_quest_confirmation")             
      } else {
        bot.playerInfo[player.uuid].currentQuest.message.text = input
        bot.globalVariables.messages.push(bot.playerInfo[player.uuid].currentQuest)
        bot.setState(player, "get_final_quest_confirmation") 
        prefix = "Das gefällt mir auch sehr! Dann sag lieber deine Version."    
        player.quests.push(bot.playerInfo[player.uuid].currentQuest)
        output.abort = 'bot'
      }
      break
          
    case "ask_content":
      if(bot.globalVariables.messages.length > 0) {
        //var randomMessage = bot.globalVariables.messages[Math.floor(Math.random() * bot.globalVariables.messages.length)]
        randomMessage = bot.globalVariables.messages[bot.globalVariables.messages.length - 1]
        var explanation = ""
        var author = Util.capitaliseFirstLetter(randomMessage.author)
        if(randomMessage.author != player.name) {
          switch(randomMessage.type) {
            case "witz":
              output.answer = "Kennst du den schon? "
              explanation = "Hat mir " + author + " erzählt. Kennst du einen besseren Witz?"
              break
            case "anmachspruch":
              output.answer = "Hey..."
              explanation = author + " meint, dass das ein super Anmachspruch ist. Kennst du einen besseren?"
              break
            case "kompliment":
              output.answer = ""
              explanation = author + " meint, dass das ein schönes Kompliment ist. Kennst du ein besseres?"
              break
            default:
              output.answer = "Was??"
              explanation = "Das ist die fieseste Beleidigung, die " + author + " eingefallen ist. Kennst du eine fiesere?"
              break
          }
          bot.playerInfo[player.uuid].currentMessageType = randomMessage.type
          output.answer += "'" + randomMessage.text + "... ' " + explanation           

        } else {
          bot.playerInfo[player.uuid].currentMessageType = messageTypes[Math.floor(Math.random() * messageTypes.length)]
          output.answer += moreMessageRequests[bot.playerInfo[player.uuid].currentMessageType]              
        }

      } else {
        bot.playerInfo[player.uuid].currentMessageType = messageTypes[Math.floor(Math.random() * messageTypes.length)]
        output.answer += messageRequests[bot.playerInfo[player.uuid].currentMessageType]
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
        bot.globalVariables.messages.push({
          text: Util.capitaliseFirstLetter(input), 
          type: bot.playerInfo[player.uuid].currentMessageType,
          author: player.name
        })
        
        if(bot.playerInfo[player.uuid].currentRelationship) {
          bot.setState(player, "get_quest_confirmation")        
          handleInput(bot, player, "ja", callback, prefix)
        } else {
          prefix += "Danke!"
          bot.setState(player, "prepare_quest")        
          handleInput(bot, player, input, callback, prefix)
        }
        return
      }
      break        
            
    case "ask_sender_confirmation":
      // respond to message type
      switch(bot.playerInfo[player.uuid].currentQuest.message.type) {
        case "witz":
          output.answer = "Hahahahaha!"
          break
        case "anmachspruch":
          output.answer = "Mmm... das macht mich an."
          break
        case "kompliment":
          output.answer = "Ohh, danke für das schöne Kompliment!"
          break
        default:
          output.answer = "Was?? Das ist ja echt fies."
          break
      }      
      
      // todo: ask openly who told you that??
      var fromBot = bot.playerInfo[player.uuid].currentQuest.fromBot
      output.answer += " Hat dir " + Util.capitaliseFirstLetter(fromBot) + " aus " + bot.playerInfo[player.uuid].currentQuest.fromPlace + " gesagt, dass du mir das sagen sollst?"
      
      bot.setState(player, "get_sender_confirmation")
      break
      
    case "get_sender_confirmation":
      if(input.search(RegexYes) != -1) {
        prefix = "Puuuh. Das ist ja was. Danke!"
        
        // check if bot already has a relationship with this bot
        var fromBot = bot.playerInfo[player.uuid].currentQuest.fromBot
        if(!bot.relationships[fromBot]) {
          var newRelationship = {
            bot: fromBot, 
            level: 1, 
            place: bot.playerInfo[player.uuid].currentQuest.fromPlace
          }
          bot.relationships[fromBot] = newRelationship
        }
        
        if(bot.playerInfo[player.uuid].currentQuest.message.type != 'beleidigung') {
          bot.relationships[fromBot].level += 1
        } else {
          bot.relationships[fromBot].level -= 2
        }
                
        player.resolveQuest(bot.playerInfo[player.uuid].currentQuest)
        bot.playerInfo[player.uuid].currentQuest = null                
        
        bot.setState(player, "prepare_quest")
        handleInput(bot, player, input, callback, prefix)
        return
      } 
      else if(input.search(RegexNo) != -1) {
        // todo: respond to message type
        prefix = "Ach soo... dann ist das ja nicht so wichtig."
        bot.setState(player, "offer_quest")
        handleInput(bot, player, input, callback, prefix)
        return
      }
      else {
        output.answer = "Bitte rede mal Klartext. Ja oder nein?"
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
