var express = require('express'),
    tweet = require('./routes/tweets'),
    fs = require('fs');

var filename = __dirname + "/config.json";
var config = JSON.parse (fs.readFileSync(filename,'utf8'));
 
var app = express();

var allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

  // intercept OPTIONS method
  if ('OPTIONS' === req.method) { res.send(200); }
  else { next(); }
};

 
app.configure(function () {
    app.use(express.logger('dev'));     /* 'default', 'short', 'tiny', 'dev' */
     app.use(allowCrossDomain);
    app.use(express.bodyParser());
});

app.get('/tweets', tweet.findAll);
app.get('/tweets/:id', tweet.findById);
app.listen(config.webserver.port);