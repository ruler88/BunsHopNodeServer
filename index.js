var express = require('express');
var url = require('url');
var gcm = require('node-gcm');
var sender = new gcm.Sender('AIzaSyBSbZfBTrAH4xXdnk_1iVLRclNTWiUcWmY');

var registeredUsers = {
	Kai: 'APA91bF__pSyj9ORTIHxiBmpBZJKE0cwM3shyVCOxBjNSlZ6MSAre8taFgbLr_cNwLYQDHyoA5LD6leM1_a8XODKghqGCmLSbH_akejKg3eHvd4QLeETycJCHHxgegFqbZV-F4KfkoQARyZbBlzfh4ed0wDFdRlqX0b31g_CozE-Vpf1r_3K7C4',
	Sarah: ''
};

var app = express();
app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));


var sendLocation = function(first_name, latitude, longitude, metaData) {
	var recipients = [];
	var message = new gcm.Message();
	message.addDataWithKeyValue('first_name', first_name);
	message.addDataWithKeyValue('latitude', latitude);
	message.addDataWithKeyValue('longitude', longitude);
	if(metaData) 	message.addDataWithKeyValue('metaData', metaData);
	for(var username in registeredUsers) {
		if(registeredUsers[username].length != 0 && first_name != username) {
			recipients.push(registeredUsers[username]);
		}
	}

	sender.send(message, recipients, 4, function(err, result) {
		console.log("result from send: \n" + JSON.stringify(result));
		if(err) {console.error(JSON.stringify(err));}
	});
};

var getLocation = function(first_name) {
	var recipients = [];
	var message = new gcm.Message();
	message.addDataWithKeyValue('getLocation', 'getLocation');
	for(var username in registeredUsers) {
		if(registeredUsers[username].length != 0 && first_name != username) {
			recipients.push(registeredUsers[username]);
		}
	}

	sender.send(message, recipients, 4, function(err, result) {
		console.log("result from send: \n" + JSON.stringify(result));
		if(err) {console.error(JSON.stringify(err));}
	});
};



app.get('/', function(request, response) {
  response.send('Hello World!');
	console.log("QUERY REQUEST: " + request);
	var queryData = url.parse(request.url, true).query;
	console.log(queryData);

	if(queryData.first_name &&
		queryData.first_name in registeredUsers) {
		//for new regid
		if(queryData.regid) {
			registeredUsers[queryData.first_name] = queryData.regid;
			console.log(registeredUsers[queryData.first_name]);
		}
		//for location updates
		if(queryData.latitude && queryData.longitude) {
			sendLocation(queryData.first_name, queryData.latitude, queryData.longitude, queryData.metaData);
		}

		if(queryData.requestLocation) {
			getLocation(queryData.first_name);
		}
	}
});

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
});
