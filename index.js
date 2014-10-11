var express = require('express');
var url = require('url');
var gcm = require('node-gcm');
var util = require('util');
var bodyParser = require('body-parser');
var sender = new gcm.Sender('AIzaSyBSbZfBTrAH4xXdnk_1iVLRclNTWiUcWmY');

var registeredUsers = {
	Kai: 'APA91bF__pSyj9ORTIHxiBmpBZJKE0cwM3shyVCOxBjNSlZ6MSAre8taFgbLr_cNwLYQDHyoA5LD6leM1_a8XODKghqGCmLSbH_akejKg3eHvd4QLeETycJCHHxgegFqbZV-F4KfkoQARyZbBlzfh4ed0wDFdRlqX0b31g_CozE-Vpf1r_3K7C4',
	Sarah: ''
};
var cachedLocation = {
	Kai: {},
	Sarah: {}
};

var app = express();
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use( bodyParser.urlencoded() ); // to support URL-encoded bodies
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
		console.log("SEND COMPLETE");
		if(err) {console.error(JSON.stringify(err));}
	});
};

var backgroundGeolocationCallback = function(first_name, location) {
	var recipients = [];
	recipients.push(registeredUsers[first_name]);
	var message = new gcm.Message();
	message.addDataWithKeyValue('first_name', first_name);
	message.addDataWithKeyValue('backgroundAjaxGelocation', 'backgroundAjaxGelocation');

	sender.send(message, recipients, 4, function(err, result) {
		console.log('Background geolocation ajax called');
	});
};

var getLocation = function(first_name) {
	var recipients = [];
	recipients.push(registeredUsers[first_name]);

	for(var username in cachedLocation) {
		if(first_name != username) {
			var message = new gcm.Message();
			var location = cachedLocation[username];
			message.addDataWithKeyValue('first_name', username);
			message.addDataWithKeyValue('latitude', location.latitude);
			message.addDataWithKeyValue('longitude', location.longitude);
			sender.send(message, recipients, 4, function(err, result) {});
		}
	}
};



app.get('/', function(request, response) {
  response.send('Hello World!');

	var queryData = url.parse(request.url, true).query;
	console.log(queryData);

	if(queryData.first_name &&
		queryData.first_name in registeredUsers) {
		//for new regid
		if(queryData.regid) {
			registeredUsers[queryData.first_name] = queryData.regid;
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

app.post('/', function(request, response) {
	response.send('Hello World!');
	var queryData = request.body;
	console.log("Post Requestion: \n" + util.inspect(queryData, {colors: true, depth:4}));
	console.log("YOLO MOTHERFUCKER: " + queryData.first_name + " - " +
			queryData.location.latitude + ", " + queryData.location.longitude);

	cachedLocation[queryData.first_name] = queryData.location;
	backgroundGeolocationCallback(queryData.first_name, queryData.location);
	sendLocation(queryData.first_name, queryData.location.latitude, queryData.location.longitude);
});

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
});
