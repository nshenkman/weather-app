
/**
 * Module dependencies
 */

var express = require('express'),
  cron = require('node-schedule'),
  bodyParser = require('body-parser'),
  methodOverride = require('method-override'),
  errorHandler = require('express-error-handler'),
  morgan = require('morgan'),
  http = require('http'),
  path = require('path'),
  mysql = require('mysql');

var app = module.exports = express();

var pool = mysql.createPool({
  host     : 'localhost',
  user     : 'root',
  database : 'weather_app',
  port : 3307
});
module.exports.getConnection =  function(callback) {
  pool.getConnection(function(err, connection){
    callback(err, connection)
  })
};

var routes = require('./routes');
var api = require('./routes/api');
var sendEmails = require('./sendEmails');

/**
 * Configuration
 */

// all environments
app.set('port', process.env.PORT || 3000);
app.use(morgan('dev'));
app.use(bodyParser());
app.use(methodOverride());
app.use(express.static(path.join(__dirname, 'public')));



var env = process.env.NODE_ENV || 'development';
var email =  process.env.EMAIL;
var pass =  process.env.PASS;

// development only
if (env === 'development') {
  app.use(errorHandler());
}

// production only
if (env === 'production') {
  // TODO
}


/**
 * Routes
 */

// serve index and view partials
app.get('/', routes.index);

// JSON API
app.post('/api/account', api.account.post);
app.get('/api/cities', api.wunderground.getCities);
app.get('/api/email-check', api.account.emailCheck);


// redirect all others to the index (HTML5 history)
app.get('*', routes.index);


/**
 * Start Server
 */

http.createServer(app).listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});


// var rule = new cron.RecurrenceRule();
// rule.hour = 9;
// cron.scheduleJob(rule, function(){
//   sendEmails.sendEmails(email, pass, function(err, res) {
//     console.log(err)
//   })
// });

