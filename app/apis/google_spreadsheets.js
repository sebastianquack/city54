/* variables */

var googleConf = {
      email: '446725146509@developer.gserviceaccount.com',
      key: process.env.googleAPIKey,
      useHTTPS: false,
      scopes: ['http://docs.google.com/feeds/','http://spreadsheets.google.com/feeds']
    }

var Spreadsheet = require('./edit-google-spreadsheet-patched')

var spreadsheetIdCache = {}
var spreadsheetCache = {}

/* functions */

var loadRoom = function (room, callback) {
	get_spreadsheet(room, callback) 
  return
}

var get_spreadsheet = function(room, callback) {
  
  // retrieve spreadsheet cache
  if (spreadsheetCache[room] != undefined) {
    console.log("found " + room + " in spreadsheet cache.")
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
  
  var useDefaultWorksheet = (worksheetId == undefined && worksheetName == undefined)

  Spreadsheet.load({
    debug: true,
    spreadsheetName: spreadsheetName,
    spreadsheetId: spreadsheetId,
    worksheetName: worksheetName,
    worksheetId: worksheetId,
    useDefaultWorksheet: useDefaultWorksheet,
    oauth : googleConf
  }, function sheetReady(err, spreadsheet) {
    if(err) {
    	//throw err
      console.log("Error in sheetReady, Message follows:")
      console.log(err)
      if (!cacheDelivered) {
        callback(undefined)
      }      
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