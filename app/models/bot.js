/*!
 * Module dependencies
 */

var mongoose = require('mongoose')
var Schema = mongoose.Schema

var BotSchema = new Schema({
  id: { type: String, default: '' },
  globalVariables: { type: Object, default: {} },
  playerInfo: { type: Object, default: {} }
})

/**
 * Register
 */

mongoose.model('Bot', BotSchema)