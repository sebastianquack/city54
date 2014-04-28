var http = require('http')

var talkToBot = function(APIKey, input, botState, joke, callback) {

  var cleverRequestCallback = function(response) {
    var str = ''
    response.on('error', function (err) { handleError(err) })
    response.on('data', function (chunk) { str += chunk })
    response.on('end', function () { eval(str) })
  }

  var options = {
    host: 'testapi.cleverscript.com',
    path: '/csapi?key=' + process.env.cleverAPIKey + 
                  '&input=' + encodeURIComponent(input) + 
                  '&cs=' + botState + 
                  '&callback=callback' + 
                  '&_oldjoke=' + encodeURIComponent(joke),
    method: 'GET',
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/34.0.1847.116 Safari/537.36',
      'referer': 'http://city54.herokuapp.com'
    }
  }
  console.log(options.path)
  http.request(options, cleverRequestCallback).end()

}

module.exports.talkToBot = talkToBot