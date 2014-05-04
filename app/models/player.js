/*!
 * Module dependencies
 */

var mongoose = require('mongoose')
var Schema = mongoose.Schema

var PlayerSchema = new Schema({
  uuid: { type: String, default: '' },
  name: { type: String, default: '' },
  state: { type: String, default: '' },
  currentRoom: { type: String, default: '' },
  currentBot: { type: String, default: '' },
  botState: { type: String, default: '' },
  currentRoomData: { type: Object, default: {}}
})


/**
 * Methods
 */

PlayerSchema.methods.setRoom = function(room, socket) {
	if (this.currentRoom != undefined && this.currentRoom != "") socket.leave(this.currentRoom)
	socket.join(room)
	this.currentRoom = room
}

/**
 * Events
 */

PlayerSchema.post('save', function () {
});

/**
 * Statics
 */

PlayerSchema.static({

})

/**
 * Register
 */

mongoose.model('Player', PlayerSchema)