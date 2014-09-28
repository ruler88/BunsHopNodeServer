var express = require('express');
var url = require('url');
var gcm = require('node-gcm');
var sender = new gcm.Sender('AIzaSyBSbZfBTrAH4xXdnk_1iVLRclNTWiUcWmY');

var registeredUsers = {
	Kai: '',
	Sarah: ''
};

var app = express();
app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));


var sendPush = function(first_name) {
	var recipients = [];
	var message = new gcm.Message();
	message.addDataWithKeyValue('origin', first_name);
	message.addDataWithKeyValue('key2','message2');

	for(var username in registeredUsers) {
		if(registeredUsers[username].length != 0) {
			recipients.push(registeredUsers[username]);
		}
	}

	sender.send(message, recipients, 4, function(err, result) {
		console.log("recips: " + recipients);
		console.log("result from send: \n" + result);
	});
};



app.get('/', function(request, response) {
  response.send('Hello World!');
	var queryData = url.parse(request.url, true).query;
	console.log(queryData);
	//todo kill test
	if(queryData.first_name) sendPush(queryData.first_name);


//	if(queryData.first_name &&
//		queryData.first_name in registeredUsers) {
//		//for new regid
//		if(queryData.regid) {
//			registeredUsers[queryData.first_name] = queryData.regid;
//			console.log(registeredUsers[queryData.first_name]);
//		}
//		//for location updates
//		if(queryData.location) {
//			//todo: update user location
//		}
//	}
});

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
});
