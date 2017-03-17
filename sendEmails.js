'use strict';
exports.sendEmails = function(email, pass, callback){
  var connection = require('./app').getConnection;
  var wunderground = require('./app').wunderground;
  var nodemailer = require('nodemailer');
  var async = require('async');
  var mustache = require('mustache');
  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: email,
      pass: pass
    }
  });

  var  mailOptions = {
    from: 'Nikita Shenkman'
  };

  var weatherTemplates = {
    high : {subject : "It's nice out! Enjoy a discount on us.", template : '<p>In {{location_name}} the weather is {{forecast.temp}} degrees and {{forecast.weather}}.</p>'},
    low : {subject : "Not so nice out? That's okay, enjoy a discount on us.", template : '<p>In {{location_name}} the weather is {{forecast.temp}} degrees and {{forecast.weather}}.</p>'},
    normal : {subject : "Enjoy a discount on us.", template : '<p>In {{location_name}} the weather is {{forecast.temp}} degrees and {{forecast.weather}}.</p>'}
  };

  async.auto(
    {
      connection : connection,
      findAccounts : ['connection', function(results, callback) {
        connection = results.connection;
        connection.query('SELECT email, location_link, location_name from weather_app.accounts', function(err, results) {
          connection.release();
          callback(err, results)
        });
      }],
      getWeatherData : ['findAccounts', function(results, callback) {
        var accounts = results.findAccounts;
        async.map(accounts, function(account, callback) {
          async.parallel({
            averageForecast : async.apply(wunderground.get, 'almanac', account.location_link),
            currentForecast : async.apply(wunderground.get, 'conditions', account.location_link)
          }, function(err, weatherData) {
            if (err) {
              callback()
            } else {
              var forecast = {};
              var averageForecast = weatherData.averageForecast.almanac;
              var currentForecast = weatherData.currentForecast.current_observation;
              forecast.averageTemp = (Number(averageForecast.temp_high.normal.F) + Number(averageForecast.temp_low.normal.F)) / 2;
              forecast.weather = currentForecast.weather;
              forecast.temp = currentForecast.temp_f;
              account.forecast = forecast;
              callback(null, account)
            }
          })
        }, callback)
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
            var html = mustache.render(weatherTemplates[weatherType].template, accountWeather);
            mailOptions.subject = weatherTemplates[weatherType].subject;
            mailOptions.html = html;
            mailOptions.to = accountWeather.email;
            transporter.sendMail(mailOptions, callback)
          }
        }, callback)
      }]
    }, callback);
};
