/**
 * Expose
 */

module.exports = function (app) {

  // render main app
  app.get('/', function (req, res) {
    res.render('home', {title: 'Foo'})
  })

}
