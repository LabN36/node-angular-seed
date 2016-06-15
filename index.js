var express = require('express')
var app = express()
var bodyParser = require('body-parser');

app.set('port', (process.env.PORT || 5000))
app.use(express.static(__dirname + '/public'))
app.use('/bower_components',  express.static(__dirname + '/bower_components'));
app.use(bodyParser.json({}));
app.use(bodyParser.urlencoded({extended:true}));

app.get('/', function(request, response) {
  response.sendFile('index.html');
})

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
})

app.post('/add',function(req,res){
    console.log(req.body);
})


