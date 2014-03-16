/*!
 * Module dependencies
 */

var mongoose = require('mongoose')
var Schema = mongoose.Schema

var PlayerSchema = new Schema({
  name: { type: String, default: '' },
  hash: { type: String, default: '' }
})


/**
 * Methods
 */

PlayerSchema.method({

})

/**
 * Statics
 */

PlayerSchema.static({

})

/**
 * Register
 */

mongoose.model('Player', PlayerSchema)