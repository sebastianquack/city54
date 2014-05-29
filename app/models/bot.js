/*!
 * Module dependencies
 */

var mongoose = require('mongoose')
var Schema = mongoose.Schema

var BotSchema = new Schema({
  name: { type: String, default: '' },
  room: { type: String, default: ''},
  _love_interest : { type: String, ref: 'Bot' },
  globalVariables: { type: Object, default: {} },
  playerInfo: { type: Schema.Types.Mixed, default: {} }
})

BotSchema.methods.findLoveInterest = function(callback) {
  if(this._love_interest) {
    this.populate('_love_interest', callback)
    return
  }
  
  var thisbot = this
  mongoose.model('Bot', BotSchema).find({ name: { $ne: thisbot.name } }, function (err, all_bots) {
    if(all_bots.length > 0) {
      var love_interest = all_bots[Math.floor(Math.random() * all_bots.length)]
      //console.log(thisbot.name + " liebt " + love_interest.name + " in " + love_interest.room)
      thisbot._love_interest = love_interest._id
      thisbot.save()      
      thisbot.populate('_love_interest', callback)
    } else {
      callback()
    }
  })  
}

/**
 * Register
 */

mongoose.model('Bot', BotSchema)
