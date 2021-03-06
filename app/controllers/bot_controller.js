/* variable declarations */

var mongoose = require('mongoose')
var Bots = mongoose.model('Bot')

var Util = require('./util.js')
var World = require('./world_controller.js')
var BasicBot = require('./bots/basic_bot.js')

/* function declarations */

var leaveBot = async function(player) {  
  Bots.findOne( { name: player.currentBot } , function(err, bot) {
    if(bot) {
      if(bot.playerInfo)
        bot.playerInfo[player.uuid].state = ""
      bot.markModified('playerInfo')
      bot.save()   
    }
  })
  player.currentBot = null
  player.state = "world" // send player back into world  
  await player.save()  
}

// handle bot chat
var handleInput = async function(socket, player, input) {
  
  // reflect player input back to player
  if (input != null & input != "") {
    Util.write(socket, player, player, input , "sender") 
  }
    
  // look up the global bot object
  Bots.findOne({ name: player.currentBot }).exec(async function(err, bot) {
    if(err) return Util.handleError(err)   

    // if nothing has been stored about this bot, create one
    if(!bot) {       
      bot = new Bots({ name: player.currentBot })
      bot.room = player.currentRoom // save the room where the bot is
      bot.globalVariables = {botname: player.currentBot} // set bot name on init
      bot.markModified('globalVariables')
      await bot.save()            
    }
           
    // check if the bot meets this player for the first time
    if(!bot.playerInfo[player.uuid]) {        
      // setup empty player info
      bot.playerInfo[player.uuid] = {}
      bot.playerInfo[player.uuid].state = ""
      bot.markModified('playerInfo')
      await bot.save()   
    }
      
    BasicBot.handleInput(bot, player, input, async function(output) { // process the bots response

      // write answer to console
      Util.write(socket, player, {name: player.currentBot}, output.answer, "sender") 

      // check if bot kicked player out
      if(output.abort) {
        output.bot.playerInfo[player.uuid].state = "" // reset bot state for this player     
        player.state = "world" // send player back into world
        await player.save()
        var exitNote = ""
        if(output.abort == 'bot') {
          exitNote = Util.capitaliseFirstLetter(output.bot.name) + " hat das Gespräch beendet."
        } else {
          exitNote = "Du wendest dich von " + Util.capitaliseFirstLetter(output.bot.name) + " ab."
        }
        Util.write(socket, player, {name: "System"}, exitNote + " " + Util.linkify("Du bist weiterhin in " + Util.capitaliseFirstLetter(player.currentRoom) + ". [schaue]"), "sender")
      } 

      // save updated bot to db
      output.bot.markModified('globalVariables')
      output.bot.markModified('relationships')
      output.bot.markModified('playerInfo')
      await output.bot.save()
    
    })
                              
  })
  
}

/* expose functionality */
module.exports.leaveBot = leaveBot
module.exports.handleInput = handleInput