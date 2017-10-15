var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var config = require('./config');
var mongoose = require('mongoose');
var VideoModel = require('./sznMongooseSchema').VideoModel;
var options = {
  server: { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 } },
  replset: { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 } }
};
//version 3.4.7
mongoose.connect(config.MONGO_MAIN4_URL, options);
mongoose.connection.on('error', function (err) {
  console.log('Error: Could not connect to MongoDB. Did you forget to run `mongod`? ', err);
});
mongoose.connection.on('open', function (err, db) {
  console.log('Database Connection Established');
  if (err) {
    console.log(err);
  } else if (db) {
    console.log(db);
  }
});
app.set('port', (process.env.PORT || 4000));
app.use(express.static(__dirname + '/public'));
app.use('/bower_components', express.static(__dirname + '/bower_components'));
app.use(bodyParser.json({}));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function (request, response) {
  response.sendFile('index.html');
});
app.get('/api/v1/dblist', function (req, res) {
  VideoModel.find({}, function (err, data) {
    if (err) {
      console.log(err);
      res.json({ error: true, err: err });
    } else {
      console.log(data.length);
      res.json({ error: true, totalVideo:data.length });
    }
  });
});
app.listen(app.get('port'), function () {
  console.log("Node app is running at localhost:" + app.get('port'))
});

app.post('/add', function (req, res) {
  console.log(req.body);
});


