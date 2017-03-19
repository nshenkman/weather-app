'use strict';
var sendEmails = function(callback){
  var connection = require('./app').getConnection;
  var wunderground = require('./app').wunderground;
  var nodemailer = require('nodemailer');
  var smtpTransport = require('nodemailer-smtp-transport');
  var async = require('async');
  var mustache = require('mustache');
  var email =  process.env.EMAIL;
  var pass =  process.env.PASS;
  var domain = process.env.DOMAIN;
  var transporter = nodemailer.createTransport(smtpTransport({
    service: 'gmail',
    auth: {
      user: email,
      pass: pass
    }
  }));

  var  mailOptions = {
    from: 'Nikita Shenkman'
  };

  var weatherTemplates = {
    high : {subject : "It's nice out! Enjoy a discount on us.", weatherUrl : 'https://s3.amazonaws.com/nshenkmanweatherapp/sunny.png'},
    low : {subject : "Not so nice out? That's okay, enjoy a discount on us.", weatherUrl : 'https://s3.amazonaws.com/nshenkmanweatherapp/rain.png'},
    normal : {subject : "Enjoy a discount on us.", weatherUrl : 'https://s3.amazonaws.com/nshenkmanweatherapp/cloudy.png'}
  };

  var getWundergroundData = function(account, callback) {
    async.parallel({
      averageForecast : async.apply(wunderground.get, 'almanac', account.location_link),
      currentForecast : async.apply(wunderground.get, 'conditions', account.location_link)
    }, function(err, weatherData) {
      if (err) {
        recordLog(account, 0, 'Error receiving data from Wunderground', callback);
      } else if (weatherData.averageForecast.error && weatherData.averageForecast.error.type == 'invalidkey' ||
        weatherData.currentForecast.error && weatherData.currentForecast.error.type == 'invalidkey') {
        // Set timeout because Wunderground developer keys allow for only 10 calls per minute or 500 calls per day
        setTimeout(function(){
          getWundergroundData(account, callback)
        },60000)
      } else {
        var forecast = {};
        var averageForecast = weatherData.averageForecast.almanac;
        var currentForecast = weatherData.currentForecast.current_observation;
        forecast.averageTemp = (Number(averageForecast.temp_high.normal.F) + Number(averageForecast.temp_low.normal.F)) / 2;
        forecast.weather = currentForecast.weather;
        forecast.temp = currentForecast.temp_f;
        forecast.url = currentForecast.forecast_url;
        account.forecast = forecast;
        callback(null, account)
      }
    })
  };

  var recordLog = function(account, success, info, callback) {
    var log = {};
    log.account_id = account.id;
    log.success = success;
    log.info = info;
    connection.query('INSERT INTO weather_app.email_logs SET ?', log,  function(err, results) {
      if (err) {
        console.log(err)
      }
      callback()
    });
  };


  async.auto(
    {
      connection : connection,
      findAccounts : ['connection', function(results, callback) {
        connection = results.connection;
        // Gets all the accounts where an email hasn't been sent successfully in the last 24 hours
        connection.query(
          'SELECT a.id, a.email, a.location_link, a.location_name ' +
        '	FROM weather_app.accounts a ' +
        '	LEFT OUTER JOIN ( ' +
        '		SELECT MAX(el.send_time) as latest_send_time, el.account_id ' +
        '		FROM weather_app.email_logs el ' +
        '		WHERE el.success = 1 ' +
        '		GROUP BY el.account_id ' +
        '		) el ON el.account_id = a.id ' +
        '	WHERE el.latest_send_time IS NULL ' +
        '	OR el.latest_send_time + INTERVAL 24 HOUR < NOW()', function(err, results) {
            callback(err, results)
          });
      }],
      getWeatherData : ['findAccounts', function(results, callback) {
        var accounts = results.findAccounts;
        async.map(accounts, getWundergroundData, callback)
      }],
      sendEmails : ['getWeatherData', function(results, callback) {
        async.each(results.getWeatherData, function(accountWeather, callback){
          if (accountWeather) {
            var weatherType = 'normal';
            var weatherDifference = accountWeather.forecast.temp - accountWeather.forecast.averageTemp;
            var weather = accountWeather.forecast.temp;
            if (weatherDifference >= 5 || weather == 'Sunny') {
              weatherType = 'high'
            } else if (weatherDifference <= -5 || weather == 'Rain') {
              weatherType = 'low'
            }
            var template ='<img src="'+weatherTemplates[weatherType].weatherUrl+'" style="display: block; margin: 0 auto;"><p style="font-family: Helvetica Neue,Helvetica,Arial,sans-serif;font-weight: 200; text-align: center;">In {{location_name}} the weather is {{forecast.temp}}F and {{forecast.weather}}. For further forecast information click <a href="{{forecast.url}}">here</a></p>'
            template += '<p style="font-family: Helvetica Neue,Helvetica,Arial,sans-serif;font-weight: 200;font-size: 8px; text-align: center">If you are no longer interested, you can <a href="'+domain+'api/account/unsubscribe?email={{email}}">unsubscribe</a></p>';
            var html = mustache.render(template, accountWeather);
            mailOptions.subject = weatherTemplates[weatherType].subject;
            mailOptions.html = html;
            mailOptions.to = accountWeather.email;
            async.waterfall([
              function(callback) {
                transporter.sendMail(mailOptions, function(err) {
                  callback(null, err)
                })
              },
              function(emailError, callback) {
                if (emailError) {
                  recordLog(accountWeather, 0, 'Error while sending email', callback)
                } else {
                  recordLog(accountWeather, 1, null, callback)
                }
              }
            ], callback);
          } else {
            callback()
          }
        }, callback)
      }],
      releaseConnection : ['sendEmails', function(results, callback) {
        results.connection.release();
        callback()
      }]
    }, callback);
};

sendEmails(function(err){
  if (err) console.log(err)
});