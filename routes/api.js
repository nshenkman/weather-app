/*
 * Serve JSON to our AngularJS client
 */
var connection = require('../app').getConnection;
var async = require('async');
var request = require('request');

// ANY USE OF ? IN SQL QUERIES AUTOMATICALLY ESCAPES CHARACTERS
exports.account  =
  {
    emailCheck : function(req, res) {
      async.auto({
        connection : connection,
        getAccount : ['connection', function(results, callback) {
          var connection = results.connection;
          if (!req.query.email) {
            callback(400, null)
          } else {
            var email = decodeURI(req.query.email);
            connection.query('SELECT email, location_link as locationLink, location_name as locationName FROM weather_app.accounts WHERE email = ? LIMIT 1', email, function(err, account) {
              callback(err, account)
            })
          }
        }]
      }, function(err, results) {
        results.connection.release();
        if (err) {
          err = typeof err ==='number' ? err : 500;
          res.send(err)
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
          if (req.body && req.body.email && req.body.locationLink && req.body.locationName) {
            var account = {};
            account.email = req.body.email;
            account.location_link = req.body.locationLink;
            account.location_name = req.body.locationName;
            connection.query('INSERT INTO weather_app.accounts SET ?', account, function(err, results) {
              if (err && err.code == 'ER_DUP_ENTRY') {
                callback(409, null)
              } else {
                callback(err, results)
              }
            })
          } else {
            callback(400, null)
          }
        }]
      }, function(err, results) {
        results.connection.release();
        if (err) {
          err = typeof err ==='number' ? err : 500;
          res.send(err)
        } else {
          res.send(200)
        }
      })
    },
    delete : function(req, res) {
      async.auto({
        connection : connection,
        createAccount : ['connection', function(results, callback) {
          var connection = results.connection;
          if (req.query.email) {
            var email = req.query.email;
            connection.query('DELETE FROM weather_app.accounts WHERE email = ?', email, function (err, results) {
              console.log(results.affectedRows)
              if (results.affectedRows == 0) {
                callback(404, null)
              } else {
                callback()
              }
            })
          } else {
            callback(400, null)
          }
        }]
      }, function(err, results) {
        results.connection.release();
        if (err) {
          err = typeof err ==='number' ? err : 500;
          var reason;
          if (err == 400) {
            reason = 'Email paramter missing'
          } else if (err == 404) {
            reason = 'Email not found'
          } else if (500) {
            reason = 'Internal server error'
          }
          res.status(err).send({status : 'failed', reason : reason})
        } else {
          res.status(300).send({status : 'success'})
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
          cities = JSON.parse(cities);
          if (cities.error) {
            res.send(503)
          } else {
            res.json(cities.RESULTS)
          }
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

