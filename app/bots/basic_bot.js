/* variable declarations */

var RegexBotExit = /^(exit|ciao|tschüss|tschüssikowski|bye|bye bye|auf wiedersehen|wiedersehen)?[\s!\.]*$/i

/* function declarations */

// handle user input
var handleInput = function(bot, player, input) {
   
  var output = {answer: "", abort: false, bot: bot}

  // check if user wants to exit conversation
  if(input) {
    if (input.search(RegexBotExit) != -1) {
      output.answer = "Tschüss!"
      output.abort = true
      return output
    }
  }

  // find out how bot reacts according to state of conversation
  switch(bot.playerInfo[player.uuid].state) {
    case 'ask_name': 
      output.answer = "Hallo, ich bin " + bot.globalVariables.botname + "! Wie heißt du?"
      bot.playerInfo[player.uuid].state = 'get_name'
      break
    
    case 'get_name':
      bot.playerInfo[player.uuid].playerName = input
      output.answer = "Danke! Bye!"
      output.abort = true
      break

    case 'greeting':  
      output.answer = "Schön dich wiederzusehen, " + bot.playerInfo[player.uuid].playerName + "! "
      output.answer += "Bin aber gerade sehr beschäftigt. Tschüss!"
      output.abort = true
      break

    // start here
    default:
      if(bot.playerInfo[player.uuid].playerName) {
        bot.playerInfo[player.uuid].state = 'greeting'
      } else {
        bot.playerInfo[player.uuid].state = 'ask_name'
      }
      
      output = handleInput(bot, player, input)
      if(bot._love_interest) {
        output.answer = bot._love_interest.name + " liebt mich, " + bot._love_interest.name + " liebt mich nicht... oh hallo! Ich hab dich gar nicht gesehen. " + output.answer
      }
      
  }  
  
  output.bot = bot // pass updated bot back to caller
  return output
}

/* expose functionality */

module.exports.handleInput = handleInput
