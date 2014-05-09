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
  previousRoom: { type: String, default: '' },
  currentRoomData: { type: Object, default: {}},  
  currentBot: { type: String, default: '' },
})

/**
 * Methods
 */

PlayerSchema.methods.setRoom = function(room, socket) {
  
  // always fix sockets (in case of reconnect)
  if (this.currentRoom != undefined && this.currentRoom != "") socket.leave(this.currentRoom)
  socket.join(room)
  
  // change attributs if there is a difference
  if (this.currentRoom != room) {
    this.previousRoom = this.currentRoom
    this.currentRoom = room
  }
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