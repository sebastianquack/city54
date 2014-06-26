var mongoose = require('mongoose')
var Bots = mongoose.model('Bot')
var Players = mongoose.model('Player')

var compare = function(a,b) {
  if (a.timestamp < b.timestamp)
     return -1
  if (a.timestamp > b.timestamp)
    return 1
  return 0
}

var adminInterface = function(req, res) {
  Bots.find({}, function(err, bots) {
    Players.find({active: true}, function(err, players) {          
      console.log(bots)
      
      var messages = []
      bots.forEach(function(bot) {
        if(bot.globalVariables.messages) {
          bot.globalVariables.messages.forEach(function(m, index) {
            m.bot = bot.name
            m.index = index
            messages.push(m)
          })
        }
      })
      
      res.render("admin", {title: '54. Stadt - admin', messages:messages.sort(compare).reverse(), players:players})
    })
  })
}

var express = require('express')
var auth = express.basicAuth('admin', process.env.city54adminpw)

/**
 * Expose
 */

module.exports = function (app) {

  // render main app
  app.get('/', function (req, res) {
    res.render('home', {title: '54. Stadt'})
  })

  // render iframe embed tool
  app.get('/embed', function (req, res) {
    res.render('embed', {title: '54. Stadt'})
  })

  // render admin interface
  app.get('/admin', auth, function (req, res) {
    adminInterface(req, res)
  })
  
  app.get('/messages/hide/:bot/:index', auth, function(req, res) {
    Bots.findOne({name: req.params.bot}, function(err, bot) {
      bot.globalVariables.messages[req.params.index].hidden = true
      bot.markModified('globalVariables')  
      bot.save(function() {
        res.redirect('/admin')
      })
    })
  })
  
  app.get('/messages/delete/:bot/:index', auth, function(req, res) {
    Bots.findOne({name: req.params.bot}, function(err, bot) {
      bot.globalVariables.messages.splice(req.params.index, 1)
      bot.markModified('globalVariables')  
      bot.save(function() {
        res.redirect('/admin')
      })
    })
  })
    
  app.get('/messages/unhide/:bot/:index', auth, function(req, res) {
    Bots.findOne({name: req.params.bot}, function(err, bot) {
      bot.globalVariables.messages[req.params.index].hidden = false
      bot.markModified('globalVariables')  
      bot.save(function() {
        res.redirect('/admin')
      })
    })
  })
  
  app.get('/quests/cancel/:player/:index', auth, function(req, res) {
    Players.findOne({name: req.params.player}, function(err, player) {
      player.quests[req.params.index].status = 'cancelled'
      player.markModified('quests')  
      player.save(function() {
        res.redirect('/admin')
      })
    })
  })
    
  app.get('/players/block/:name', auth, function(req, res) {
    Players.findOne({name: req.params.name}, function(err, player) {
      player.blocked = true
      player.save(function() {
        res.redirect('/admin')
      })
    })
  })

  app.get('/players/unblock/:name', auth, function(req, res) {
    Players.findOne({name: req.params.name}, function(err, player) {
      player.blocked = false
      player.save(function() {
        res.redirect('/admin')     
      })
    })
  })
  
  

}
