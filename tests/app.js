var request = require('supertest')
  , assert = require('assert')
  , config = require('../lib/config.js')
  ;

var options = {
 'key': '0AqR8dXc6Ji4JdHR5WWdUU2dYUElPaFluUlBJbkFOMUE'
};
config.set('database:country:spreadsheetKey', options.key);

// only require after setting config ...
var model = require('../lib/model.js').OpenDataCensus
  ;

var app = require('../app.js').app;

describe('Country', function() {
  before(function(done) {
    model.backend.login(function(err){
      if (err) throw err;
      model.load(function() {
        done();
      });
    });
  });

  it('front page works', function(done) {
    request(app)
      .get('/country/')
      .expect(200, done)
      ;
  });

  it('GET Submission', function(done) {
    request(app)
      .get('/country/submit/')
      .expect(200)
      .end(function(err, res) {
        assert(res.text.match('Country - Submit'));
        done();
      });
  });

  function testRadio(text, name, value) {
    var exp = 'name="%name" value="%value" checked="true"'
      .replace('%name', name)
      .replace('%value', value)
      ;
    assert(text.match(exp), 'Not checked: ' + name + ' ' + value);
  }

  it('GET Submission with pre-populated no entry', function(done) {
    var prefill = {
      // country with nothing in our test db ...
        place: 'Uganda'
      , dataset: 'emissions'
      , exists: 'Yes'
      , digital: 'Unsure'
      , online: 'No'
      , url: 'http://xyz.com'
      , details: 'Lots of random stuff\n\nincluding line breaks'
    };
    request(app)
      .get('/country/submit/')
      .query(prefill)
      .expect(200)
      .end(function(err, res) {
        assert(!err);
        // all test regex tests are rather hacky ...
        assert(res.text.match('value="%s" selected="true"'.replace('%s', prefill.place)), 'place not set');
        assert(res.text.match('value="emissions" selected="true"'), 'dataset not set');
        assert(res.text.match('value="emissions" selected="true"'), 'dataset not set');
        testRadio(res.text, 'exists', prefill.exists);
        testRadio(res.text, 'digital', prefill.digital);
        testRadio(res.text, 'online', prefill.online);
        assert(res.text.match('name="url" value="' + prefill.url + '"'), 'url not set');
        assert(res.text.match(prefill.details + '</textarea>'), 'details not set');
        done();
      });
  });

  it('GET Submission pre-populated with entry', function(done) {
    var prefill = {
      // country in our test db for default year
        place: 'United Kingdom'
      , dataset: 'maps'
    };
    var url = 'http://www.ordnancesurvey.co.uk/opendata/';
    request(app)
      .get('/country/submit/')
      .query(prefill)
      .expect(200)
      .end(function(err, res) {
        assert(!err);
        // all test regex tests are rather hacky ...
        assert(res.text.match('value="%s" selected="true"'.replace('%s', prefill.place)), 'place not set');
        testRadio(res.text, 'exists', 'Yes');
        testRadio(res.text, 'openlicense', 'No');
        assert(res.text.match('name="url" value="' + url + '"'), 'url not set');
        done();
      });
  });

  it('POST Submission', function(done) {
    request(app)
      .post('/country/submit/')
      .type('form')
      .field('year', '2014')
      .field('dataset', 'timetables')
      .field('place', 'Germany')
      .field('exists', 'No')
      .expect(302)
      .end(function(err, res) {
        assert.equal(res.header['location'], '/country/overview/Germany');
        done();
      });
  });
});
