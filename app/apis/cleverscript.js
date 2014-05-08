var http = require('http')

var talkToBot = function(APIKey, player, bot, input, callback) {

  var cleverRequestCallback = function(response) {
    var str = ''
    response.on('error', function (err) { handleError(err) })
    response.on('data', function (chunk) { str += chunk })
    response.on('end', function () { eval(str) })
  }

  // setup for now: there is 1 bot, variables determine its state
  // player.currentBot is our id of the bot
  // player.bots[player.currentBot].state is the cleverscript state of this bot
  // player.bots[player.currentBot].variables are the player specific variables that are passed in to cleverscript
  // bot.variables holds the global variables of the bot

  if(!player.bots[player.currentBot]) {
    player.bots[player.currentBot] = {variables: {}, state: null}
  } else {
    botState = player.bots[player.currentBot].state
  }
  
  // if the conversation is not already ongoing, init bot with variables through input
  if(!player.bots[player.currentBot].state) {
    input = ""
    
    // set global bot variables
    /*if(bot.variables["botname_other"])
      input += "/" + bot.variables["botname_other"]
    else*/
      input += "/" + player.currentBot
    
    if(bot.variables["joke_other"])
      input += "/" + bot.variables["joke_other"]
    else
      input += "/undefined"

    // set player specific bot variables  
    if(player.bots[player.currentBot].variables["playername_other"])  
      input += "/" + player.bots[player.currentBot].variables["playername_other"]
    else 
      input += "/undefined"
  
    input += "/"
    botState = ""
  }
      
  var options = {
    host: 'testapi.cleverscript.com',
    path: '/csapi?key=' + process.env.cleverAPIKey + 
                  '&input=' + encodeURIComponent(input) + 
                  '&cs=' + botState + 
                  '&callback=callback',
    method: 'GET',
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/34.0.1847.116 Safari/537.36',
      'referer': 'http://city54.herokuapp.com'
    }
  }
  console.log("calling cleverscrtip with...")
  console.log(options.path)
  http.request(options, cleverRequestCallback).end()

}

module.exports.talkToBot = talkToBot