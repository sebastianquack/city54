/* variable declarations */

var mongoose = require('mongoose')
var Bot = mongoose.model('Bot')
var Cleverscript = require('./apis/cleverscript')
var RegexBotExit = /^(exit|ciao|tschüss|tschüssikowski|bye|bye bye|auf wiedersehen|wiedersehen)?[\s!\.]*$/i

var Util = require('./util.js')
var World = require('./world_controller.js')

/* function declarations */

// handle bot chat
var handleInput = function(socket, player, input) {
  
  var command = Util.getCommand(input)
  if(typeof command == "string" && command.search(RegexBotExit) != -1) { // abort bot session
    player.state = "world"
    player.bots[player.currentBot].state = null // reset bot state for this player
    player.markModified('bots');
    player.save()
    World.handleInput(socket, player, null)
    return
  }
    
  // look up the global bot object
  Bot.findOne( { id: player.currentBot } , function(err, bot) {
    if(err) return Util.handleError(err)   
    if(!bot) { // if bot hasen't been created, create a new one
      bot = new Bot({ id: player.currentBot })
      bot.save()
    }
     
    // call cleverscript with player and bot and process result
    Cleverscript.talkToBot(process.env.cleverAPIKey, player, bot, input, function(data) {
      console.log("data object sent back by cleverscript:")
      console.log(data)
      
      Util.write(socket, {name: player.currentBot}, data.output, "sender") // inform the player what the bot said

      if(player.bots[player.currentBot] == undefined)
        player.bots[player.currentBot] = {} // in case bots object isn't set yet
      if(player.bots[player.currentBot].variables == undefined)
        player.bots[player.currentBot].variables = {} // in case variables object isn't set yet        
      player.bots[player.currentBot].state = data.cs // store the state variable

      // save bot variables    
      for (var key in data) {    
        
        switch(key) {
          
        // global bot variables
        case "botname_other": 
          //bot.variables[key] = data[key]
          break
        case "joke_other": 
          bot.variables[key] = data[key]
          break
        
        // player specific bot variables
        case "playername_other": 
          player.bots[player.currentBot].variables[key] = data[key]
          break
        
        // check if bot kicked player out of conversation
        case 'bot_abort':
          if(data[key] == 1) {
            player.state = "world" // send player back into world
            player.bots[player.currentBot].state = null // reset bot state for this player
          }
        }
      
      }
  
      player.markModified('bots');
      player.save()
      bot.markModified('variables');
      bot.save()
      
      console.log(player.bots)
      console.log(bot)      
      
      if(player.state == 'world') {
        World.handleInput(socket, player, null) 
      }
      
    })

  })
  
}

/* expose functionality */
module.exports.handleInput = handleInput