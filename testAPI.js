var chai = require('chai');
var chaiHttp = require('chai-http');
var app = require('./app.js');
var should = chai.should();
var async = require('async');

function truncateDB (done) {
  app.getConnection(function(err, connection) {
    if (err) throw err;
    connection.query('DELETE FROM weather_app.accounts', function(err) {
      connection.release();
      if (err) throw err;
      done()
    });
  });
}

chai.use(chaiHttp);
describe('Account', function() {
  before(truncateDB);
  describe('GET /api/email-check', function() {
    // Creates an Account to test
    before(function(done) {
      app.getConnection(function(err, connection) {
        if (err) throw err;
        connection.query('DELETE FROM weather_app.accounts', function(err) {
          if (err) throw err;
          connection.query("INSERT INTO weather_app.accounts SET email = 'test@test.org', location_name = 'Boston, Massachusetts', location_link='/q/zmw:02108.1.99999'", function (err) {
            connection.release();
            if (err) throw err;
            done()
          });
        })
      });
    });
    it('should respond with 400 with existent email', function(done) {
      chai.request(app)
        .get('/api/email-check')
        .query({email: 'test@test.org'})
        .end(function(err, res) {
          should.exist(err);
          res.should.have.status(400);
          done();
        });
    });
    it('should respond with 200 with non-existent email', function(done) {
      chai.request(app)
        .get('/api/email-check')
        .query({email: 'non-existent@email.com'})
        .end(function(err, res) {
          should.not.exist(err);
          res.should.have.status(200);
          done();
        });
    });

    it('should respond with 400 with missing email param', function(done) {
      chai.request(app)
        .get('/api/email-check')
        .end(function(err, res) {
          should.exist(err);
          res.should.have.status(400);
          done();
        });
    });
  });
  describe('POST /api/account', function() {
    before(truncateDB);
    it('should create account and respond 200 for allowed account credentials', function(done) {
      var createAccount = function(callback) {
        chai.request(app)
          .post('/api/account')
          .send({
            email: 'test@test.org',
            locationName: 'Boston, Massachusetts',
            locationLink: '/q/zmw:02108.1.99999'
          })
          .end(function (err, res) {
            should.not.exist(err);
            res.should.have.status(200);
            callback();
          });
      };
      var checkAccount = function(callback) {
        chai.request(app)
          .get('/api/email-check')
          .query({email: 'test@test.org'})
          .end(function(err, res) {
            should.exist(err);
            res.should.have.status(400);
            callback();
          });
      };
      async.series([
        createAccount,
        checkAccount
      ], done)
    });
    it('should not create account and respond 409 for existent account email', function(done) {
      chai.request(app)
        .post('/api/account')
        .send({
          email: 'test@test.org',
          locationName: 'San Francisco, California',
          locationLink: '/link/here'
        })
        .end(function (err, res) {
          should.exist(err);
          res.should.have.status(409);
          done();
        });
    });
    it('should not create account and respond 400 for missing email', function(done) {
      chai.request(app)
        .post('/api/account')
        .send({
          locationName: 'San Francisco, California',
          locationLink: '/link/here'
        })
        .end(function (err, res) {
          should.exist(err);
          res.should.have.status(400);
          done();
        });
    });
    it('should not create account and respond 400 for missing location name', function(done) {
      chai.request(app)
        .post('/api/account')
        .send({
          email: 'test@test.org',
          locationLink: '/link/here'
        })
        .end(function (err, res) {
          should.exist(err);
          res.should.have.status(400);
          done();
        });
    });
    it('should not create account and respond 400 for missing location link', function(done) {
      chai.request(app)
        .post('/api/account')
        .send({
          email: 'test@test.org',
          locationName: 'San Francisco, California'
        })
        .end(function (err, res) {
          should.exist(err);
          res.should.have.status(400);
          done();
        });
    });
    it('should not create account and respond 400 for missing body', function(done) {
      chai.request(app)
        .post('/api/account')
        .end(function (err, res) {
          should.exist(err);
          res.should.have.status(400);
          done();
        });
    });
  });
  describe('GET /api/account/unsubscribe', function() {
    // Creates an Account to unsubscribe from
    before(function (done) {
      app.getConnection(function (err, connection) {
        if (err) throw err;
        connection.query('DELETE FROM weather_app.accounts', function (err) {
          if (err) throw err;
          connection.query("INSERT INTO weather_app.accounts SET email = 'test@test.org', location_name = 'Boston, Massachusetts', location_link='/q/zmw:02108.1.99999'", function (err) {
            connection.release();
            if (err) throw err;
            done()
          });
        })
      });
    });
    it('should unsubscribe the account and respond 200', function (done) {
      var unsubscribeAccount = function (callback) {
        chai.request(app)
          .get('/api/account/unsubscribe')
          .query({email: 'test@test.org'})
          .end(function (err, res) {
            should.not.exist(err);
            res.should.have.status(200);
            callback();
          });
      };
      var checkAccount = function (callback) {
        chai.request(app)
          .get('/api/email-check')
          .query({email: 'test@test.org'})
          .end(function (err, res) {
            should.not.exist(err);
            res.should.have.status(200);
            callback();
          });
      };
      async.series([
        unsubscribeAccount,
        checkAccount
      ], done)
    });
    it('should not unsubscribe and respond 404 for non existent email', function (done) {
        chai.request(app)
          .get('/api/account/unsubscribe')
          .query({email: 'non-existent@email.com'})
          .end(function (err, res) {
            should.exist(err);
            res.body.should.be.eql({"status":"failed","reason":"Email not found"});
            res.should.have.status(404);
            done();
          });
    });
    it('should not unsubscribe and respond 400 for missing email param', function (done) {
      chai.request(app)
        .get('/api/account/unsubscribe')
        .end(function (err, res) {
          should.exist(err);
          res.body.should.be.eql({"status":"failed","reason":"Email parameter missing"});
          res.should.have.status(400);
          done();
        });
    });
  });
});