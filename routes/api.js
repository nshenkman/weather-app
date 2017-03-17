/*
 * Serve JSON to our AngularJS client
 */
var connection = require('../app').getConnection;
var async = require('async');
var request = require('request');


exports.account  =
  {
    emailCheck : function(req, res) {
      async.auto({
        connection : connection,
        getAccount : ['connection', function(results, callback) {
          var connection = results.connection;
          var email = decodeURI(req.query.email);
          connection.query('SELECT email, location_link as locationLink, location_name as locationName FROM weather_app.accounts WHERE email = ? LIMIT 1', connection.escape(email), function(err, account) {
            connection.release();
            callback(err, account)
          })
        }]
      }, function(err, results) {
        if (err) {
          console.log(err);
          res.send(500)
        } else if (results.getAccount.length == 1) {
          res.send(400)
        } else {
          res.send(200)
        }
      })
    },
    post : function(req, res) {
      async.auto({
        connection : connection,
        createAccount : ['connection', function(results, callback) {
          var connection = results.connection;
          var account = {};
          account.email = connection.escape(req.body.email);
          account.location_link = connection.escape(req.body.locationLink);
          account.location_name = connection.escape(req.body.locationName);
          connection.query('INSERT INTO weather_app.accounts SET ?', account, function(err, results) {
            connection.release();
            callback(err, results)
          })
        }]
      }, function(err) {
        if (err) {
          console.log(err);
          res.send(500)
        } else {
          res.send(200)
        }
      })
    }
  };

exports.wunderground = function() {
  var self;
  return {
    init : function(apiKey) {
      self = this;
      self.apiKey = apiKey;
      return self;
    },
    getCities : function(req, res) {
      var qs = req.query;
      async.auto({
        getCities : function(callback) {
          qs.c = 'US';

          var options = {
            uri : 'http://autocomplete.wunderground.com/aq',
            method : 'GET',
            qs : qs
          };

          request(options, function(err, response, body) {
            callback(err, body)
          })
        }
      }, function(err, results){
        if (err) {
          res.send(500)
        } else {
          var cities = results.getCities;
          cities = JSON.parse(cities).RESULTS;
          res.json(cities)
        }
      })
    },
    get : function(type, urlRoute, callback) {
      var apiKey = self.apiKey;
      async.auto({
        request : function(callback) {
          var options = {
            url : 'http://api.wunderground.com/api/'+apiKey+'/'+ type + urlRoute + '.json',
            method : 'GET'
          };
          request(options, function(err, response, body) {
            callback(err, body)
          })
        }
      }, function(err, results) {
        if (err) {
          callback(err, {})
        } else {
          var apiResponse = results.request;
          apiResponse = JSON.parse(apiResponse);
          callback(null, apiResponse)
        }
      })
    }
  };
};

