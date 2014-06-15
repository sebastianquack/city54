/*!
 * Module dependencies
 */

var mongoose = require('mongoose')
var Schema = mongoose.Schema

var BotSchema = new Schema({
  name: { type: String, default: '' },
  room: { type: String, default: ''},
  relationships: { type: Object, default: {} },
  globalVariables: { type: Object, default: {} },
  playerInfo: { type: Schema.Types.Mixed, default: {} }
})

/* expose functionality */

BotSchema.methods.setState = function(player, state) {
  this.playerInfo[player.uuid].state = state
}

BotSchema.methods.findRandomOtherBot = function(callback) {  
  var thisbot = this
  mongoose.model('Bot', BotSchema).find({ name: { $ne: thisbot.name } }, function (err, all_bots) {
    if(all_bots.length > 0) {
      var randomBot = all_bots[Math.floor(Math.random() * all_bots.length)]
      //console.log(thisbot.name + " liebt " + love_interest.name + " in " + love_interest.room)
      callback(randomBot)
    } else {
      callback(null)
    }
  })  
}

/**
 * Register
 */

mongoose.model('Bot', BotSchema)
