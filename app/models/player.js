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
  currentChat: { type: String, default: '' },
  previousChat: { type: String, default: '' },
  quests: { type: Array, default: [] }
})

/**
 * Methods
 */

PlayerSchema.methods.setRoom = function(room, socket) {

  // always fix sockets (in case of reconnect)
  if (this.currentRoom != undefined && this.currentRoom != "") socket.leave(this.currentRoom)
  socket.join(room)

  this.currentChat = "" // clean up

  // change attributs if there is a difference
  if (this.currentRoom != room) {
    this.previousRoom = this.currentRoom
    this.currentRoom = room
    this.previousChat = "" // a new chance for chat
  }
}

PlayerSchema.methods.addQuest = function(questGiver, fromBot, toBot, message) {
  this.quests.push({questGiver: questGiver, fromBot: fromBot, toBot: toBot, message: message, status: 'active'})
}

PlayerSchema.methods.getActiveQuestFromBot = function(fromBot) {
  for (i in this.quests) {
    if((this.quests[i].fromBot == fromBot) && this.quests[i].status == 'active') {
      return this.quests[i]
    }
  }
  return null
}

PlayerSchema.methods.getActiveQuestToBot = function(toBot) {
  for (i in this.quests) {
    if((this.quests[i].toBot == toBot) && this.quests[i].status == 'active') {
      return this.quests[i]
    }
  }
  return null
}

PlayerSchema.methods.getActiveQuest = function(fromBot, toBot) {
  for (i in this.quests) {
    if((this.quests[i].fromBot == fromBot) && (this.quests[i].toBot == toBot) && this.quests[i].status == 'active') {
      return this.quests[i]
    }
  }
  return null
}



PlayerSchema.methods.resolveQuest = function(quest) {
  for (i in this.quests) {
    if(this.quests[i] == quest) {
      this.quests[i].status = 'resolved'
      return
    }
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