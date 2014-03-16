
/**
 * Module dependencies.
 */

// controllers
var home = require('home')

/**
 * Expose
 */

module.exports = function (app) {

  app.get('/', home.index)

}
