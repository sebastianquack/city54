/* variables */

var googleConf = {
	  // use the email address of the service account, as seen in the API console
	  email: '446725146509@developer.gserviceaccount.com',
	  // use the PEM file we generated from the downloaded key
	  //keyFile: 'key.pem',
	  key: process.env.googleAPIKey,
	  expiration: 30000,
	  useHTTPS: false,
	  // specify the scopes you wish to access 
	  scopes: ['https://www.googleapis.com/auth/drive.readonly','https://spreadsheets.google.com/feeds']
}
var Spreadsheet = require('./edit-google-spreadsheet-patched')
var TokenCache = require('google-oauth-jwt').TokenCache
var tokens = new TokenCache()

var spreadsheetIdCache = {}
var spreadsheetCache = {}

/* functions */

var loadRoom = function (room, callback) {
	// will automatically acquire new token if expired
	tokens.get(googleConf, function (err, token) {
	  console.log("google OAuth token: " + token)
	  try { get_spreadsheet(token, room, callback) }
    catch (err) { throw err }
	})
}

var get_spreadsheet = function(token, room, callback) {
  
  // retrieve spreadsheet cache
  if (spreadsheetCache[room] != undefined) {
    console.log("retrieving " + room + " from cache.")
    callback(spreadsheetCache[room])
    var cacheDelivered = true
  }

  // define spreadsheet names

  var parts = room.split("/")

  spreadsheetName = parts[0]

  if (parts.length == 1) 
    worksheetName = undefined
  else 
    worksheetName = parts[1]

  //console.log("loading room " + room + " (" + spreadsheetName + "/" + worksheetName +")")


  // retrieve spreadsheet ID cache
  if (spreadsheetIdCache[spreadsheetName] != undefined && spreadsheetIdCache[spreadsheetName][worksheetName] != undefined) {
  	spreadsheetId = spreadsheetIdCache[spreadsheetName][worksheetName].spreadsheetId
  	worksheetId = spreadsheetIdCache[spreadsheetName][worksheetName].worksheetId
  	spreadsheetName = undefined
  	worksheetName = undefined
  }
  else {
  	spreadsheetId = undefined
  	worksheetId = undefined
  }
  
  Spreadsheet.load({
    debug: true,
    spreadsheetName: spreadsheetName,
    spreadsheetId: spreadsheetId,
    worksheetName: worksheetName,
    worksheetId: worksheetId,
    // Choose from 1 of the 3 authentication methods:
    //    1. Username and Password
    //username: 'my-name@google.email.com',
    //password: 'my-5uper-t0p-secret-password',
    // OR 2. OAuth
    //oauth : {
    //  email: '446725146509@developer.gserviceaccount.com',
    //  keyFile: 'key.pem'
    //}
    // OR 3. Token
    accessToken : {
      type: 'Bearer',
      token: token
    }
  }, function sheetReady(err, spreadsheet) {
    if(err) {
    	//throw err
      // TODO: catch error and reset player
      console.log(err)
    	return
    }
    
  	// populate cache
  	if (typeof spreadsheetIdCache[spreadsheetName] == "undefined") {
  		spreadsheetIdCache[spreadsheetName] = {} 
  		spreadsheetIdCache[spreadsheetName][spreadsheet.worksheetName] = {spreadsheetId: spreadsheet.spreadsheetId, worksheetId: spreadsheet.worksheetId}
  		console.log("cached spreadsheet IDs for " + spreadsheetName + " / " + spreadsheet.worksheetName + " as " + spreadsheet.spreadsheetId + " / " + spreadsheet.worksheetId)
  	}
  	else if (typeof spreadsheetIdCache[spreadsheetName][spreadsheet.worksheetName] == "undefined") {
  		spreadsheetIdCache[spreadsheetName][spreadsheet.worksheetName] = {spreadsheetId: spreadsheet.spreadsheetId, worksheetId: spreadsheet.worksheetId}
  		console.log("cached spreadsheet IDs for " + spreadsheetName + " / " + spreadsheet.worksheetName + " as " + spreadsheet.spreadsheetId + " / " + spreadsheet.worksheetId)
  	}
    
    // process worksheet
    spreadsheet.receive(function(err, rows, info) {
      if(err) throw err

    	keys = rows[1]
    	data = new Object
    	for (k in keys) {
    		data[keys[k]] = []
    	}
    	for (i in rows) {
    		if (i > 1) {
    			for (k in keys) {
    				if (typeof rows[i][k] == "undefined") data[keys[k]].push("")
    				else data[keys[k]].push(rows[i][k])
    			}
    		}
    	}
      
      // populate cache
      spreadsheetCache[room] = data
      // callback
      if (!cacheDelivered) callback(data)
      
    })
  })
}

/* expose */

module.exports.loadRoom = loadRoom