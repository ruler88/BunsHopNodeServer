var express = require('express');
var url = require('url');
var GCM = require('gcm').GCM;
var apiKey = 'AIzaSyBSbZfBTrAH4xXdnk_1iVLRclNTWiUcWmY';
var gcm = new GCM(apiKey);

var app = express();
app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));


var sendPush = function() {
	var message = {
		registration_id: 'APA91bGnxRsa5Fhq2-WuLu4I1Hk71liH28ceVOHA_zvCEcXXaJbBLw55A4_nwZ5HFNNmpJ6Krx-F4X3IjXLC8VVzJhypGAwEFqD2GtwxeNKbBElLd_AnhTcYs1ZQLDexg2Xfvn3TeT6Jkl1iqJb0f2YYu7t0IwzTzZId13jmnp5jJGnC0jsVT_w',
		message: "this is a nice message",
		title: 'title4life'
	};
	gcm.send(message, function(err, messageId){
		if (err) {
			console.log("Something has gone wrong!");
		} else {
			console.log("Sent with message ID: ", messageId);
		}
	});
};



app.get('/', function(request, response) {
  response.send('Hello World!');
	var queryData = url.parse(request.url, true).query;
	sendPush();
	console.log(queryData);
});

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
});
