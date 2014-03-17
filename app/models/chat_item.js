/*!
 * Module dependencies
 */

var mongoose = require('mongoose')
var Schema = mongoose.Schema

var ChatItemSchema = new Schema({
  player_uuid: { type: String, default: '' },
  value: { type: String, default: '' },
})

/**
 * Register
 */

mongoose.model('ChatItem', ChatItemSchema)