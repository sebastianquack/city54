var Spreadsheet = require('edit-google-spreadsheet');

var TokenCache = require('google-oauth-jwt').TokenCache,
tokens = new TokenCache();




loadRoom = function (room, callback) {
	tokens.get({
	  // use the email address of the service account, as seen in the API console
	  email: '446725146509@developer.gserviceaccount.com',
	  // use the PEM file we generated from the downloaded key
	  //keyFile: 'key.pem',
	  key: process.env.googleAPIKey,
	  //expiration: 5000,
	  useHTTPS: false,
	  // specify the scopes you wish to access 
	  scopes: ['https://www.googleapis.com/auth/drive.readonly','https://spreadsheets.google.com/feeds']
	}, function (err, token) {
	  console.log(token)
	  get_spreadsheet(token, room, callback)
	});
}


get_spreadsheet = function(token, room, callback) {
  Spreadsheet.load({
    debug: true,
    spreadsheetName: room,
    worksheetName: room,
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
    if(err) throw err;

    spreadsheet.receive(function(err, rows, info) {
      if(err) throw err;

		keys = rows[1]
		data = new Object;
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
        console.log(data)
        callback(data)
      
    });
  });
}

module.exports.loadRoom = loadRoom

