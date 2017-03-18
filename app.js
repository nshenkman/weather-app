
/**
 * Module dependencies
 */

var express = require('express'),
  cron = require('node-schedule'),
  bodyParser = require('body-parser'),
  methodOverride = require('method-override'),
  morgan = require('morgan'),
  http = require('http'),
  path = require('path'),
  mysql = require('mysql');

var app = module.exports = express();

var env = process.env.NODE_ENV || 'local';
var email =  process.env.EMAIL;
var pass =  process.env.PASS;
var host = process.env.DB_HOST;
var dbUser = process.env.DB_USER;
var dbPass = process.env.DB_PASS;
var wundergroundApiKey = process.env.WUNDERGROUND_API_KEY;

var dbOptions = {
  database : 'weather_app'
};
// local only
if (env === 'local' || env === 'test') {
  dbOptions.host = 'localhost';
  dbOptions.user = 'root';
  dbOptions.port = 3307;
}


// production only
if (env === 'production') {
  dbOptions.host = host;
  dbOptions.user = dbUser;
  dbOptions.password = dbPass;
}

var pool = mysql.createPool(dbOptions);

module.exports.getConnection =  function(callback) {
  pool.getConnection(function(err, connection){
    console.log(err)
    callback(err, connection)
  })
};


var routes = require('./routes');
var api = require('./routes/api');

var wunderground = api.wunderground().init(wundergroundApiKey);
module.exports.wunderground = wunderground;

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

/**
 * Routes
 */

// serve index and view partials
app.get('/', routes.index);

// JSON API
app.post('/api/account', api.account.post);
app.get('/api/email-check', api.account.emailCheck);
app.get('/api/cities', wunderground.getCities);



// redirect all others to the index (HTML5 history)
app.get('*', routes.index);


/**
 * Start Server
 */

http.createServer(app).listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});

var rule = new cron.RecurrenceRule();
//EAST COAST TIME
rule.hour = 8;
cron.scheduleJob(rule, function(){
  sendEmails.sendEmails(email, pass, function(err, res) {
    console.log(err)
  })
});

