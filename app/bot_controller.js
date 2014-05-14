/* variable declarations */

var mongoose = require('mongoose')
var Bots = mongoose.model('Bot')
var Cleverscript = require('./apis/cleverscript')
var RegexBotExit = /^(exit|ciao|tschüss|tschüssikowski|bye|bye bye|auf wiedersehen|wiedersehen)?[\s!\.]*$/i

var Util = require('./util.js')
var World = require('./world_controller.js')

var globalBotVariables = ["botname", "joke", "jokeauthor"]
var playerBotVariables = ["playername"]

/* function declarations */

var encodeBotVariables = function(bot, player) {
  
  input = "/"
  globalBotVariables.forEach(function(key) {    
    input += bot.globalVariables[key] + "/"  
  })

  playerBotVariables.forEach(function(key) {
    input += bot.playerInfo[player.uuid].variables[key] + "/"
  })
  
  return input 
}

var saveBotState = function(bot, player, data) {
    
  bot.playerInfo[player.uuid].state = data.cs // save the state

  globalBotVariables.forEach(function(key) {    
    if(data[key + "_other"])
      bot.globalVariables[key] = data[key + "_other"]
    else
      bot.globalVariables[key] = data[key]
  })

  playerBotVariables.forEach(function(key) {
    if(data[key + "_other"])
      bot.playerInfo[player.uuid].variables[key] = data[key + "_other"]
    else 
      bot.playerInfo[player.uuid].variables[key] = data[key]
  })

  bot.markModified('globalVariables');
  bot.markModified('playerInfo');
  bot.save()
  
}

var leaveBot = function(player) {
  player.state = "world" // send player back into world
  player.save()
  
  Bots.findOne( { id: player.currentBot } , function(err, bot) {
    if(err) return Util.handleError(err)   
    if(!bot) return

    bot.playerInfo[player.uuid].state = "" // reset bot state for this player 
    bot.markModified('playerInfo');
    bot.save()   
  })
}

// handle bot chat
var handleInput = function(socket, player, input) {
  
  var command = Util.getCommand(input)
  if(typeof command == "string" && command.search(RegexBotExit) != -1) { // abort bot session
    leaveBot(player)
    World.handleInput(socket, player, null)
    return
  }

  // reflect player input back to player
  if (input != null & input != "") {
    Util.write(socket, player, player, input , "sender") 
  }
    
  // look up the global bot object
  Bots.findOne( { id: player.currentBot } , function(err, bot) {
    if(err) return Util.handleError(err)   

    // if nothing has been stored about this bot, create one
    if(!bot) { 
      bot = new Bots({ id: player.currentBot })
      bot.globalVariables = {botname: player.currentBot} // set bot name on init
      bot.markModified('globalVariables');
      bot.save()
    }
       
    // check if the bot meets this player for the first time
    if(!bot.playerInfo[player.uuid]) {

      // setup empty player info
      bot.playerInfo[player.uuid] = {}
      bot.playerInfo[player.uuid].state = ""
      bot.playerInfo[player.uuid].variables = {}
      bot.markModified('playerInfo');
      bot.save()
            
    }

    // check if there is no ongoing conversation to continue
    if(bot.playerInfo[player.uuid].state == "") {
      // we need to reset the bots internal state through the first input we send to it
      input = encodeBotVariables(bot, player)
    }

    // call up cleverscript and process response
    Cleverscript.talkToBot(process.env.cleverAPIKey, bot.playerInfo[player.uuid].state, input, function(data) {
      
      console.log("data object sent back by cleverscript:")
      console.log(data)
  
      // inform the player what the bot said
      Util.write(socket, player, {name: player.currentBot}, data.output, "sender") 

      saveBotState(bot, player, data)
      console.log("updated bot data")
      console.log(bot)
      console.log(bot.playerInfo[player.uuid])      

      // check if bot kicked player out
      if(data['bot_abort'] == '1') {
        leaveBot(player)
        World.handleInput(socket, player, null) 
      }
      
    }) 
                  
  })
  
}

/* expose functionality */
module.exports.leaveBot = leaveBot
module.exports.handleInput = handleInput