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


}
