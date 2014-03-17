/*!
 * Module dependencies
 */

var mongoose = require('mongoose')
var Schema = mongoose.Schema

var PlayerSchema = new Schema({
  uuid: { type: String, default: '' },
  name: { type: String, default: '' }
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