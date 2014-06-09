/*!
 * Module dependencies
 */

var mongoose = require('mongoose')
var Schema = mongoose.Schema

var QuestSchema = new Schema({
  
})

/* expose functionality */

/**
 * Register
 */

mongoose.model('Quest', QuestSchema)
