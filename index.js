var express = require('express');
var url = require('url');
var gcm = require('node-gcm');
var util = require('util');
var bodyParser = require('body-parser');
var pg = require('pg');

var sender = new gcm.Sender('AIzaSyBSbZfBTrAH4xXdnk_1iVLRclNTWiUcWmY');

var registeredUsers = {
	Kai: 'APA91bF__pSyj9ORTIHxiBmpBZJKE0cwM3shyVCOxBjNSlZ6MSAre8taFgbLr_cNwLYQDHyoA5LD6leM1_a8XODKghqGCmLSbH_akejKg3eHvd4QLeETycJCHHxgegFqbZV-F4KfkoQARyZbBlzfh4ed0wDFdRlqX0b31g_CozE-Vpf1r_3K7C4',
	Sarah: ''
};
var cachedLocation = {
	Kai: {},
	Sarah: {}
};
var updateMarkerMessage;

var app = express();
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use( bodyParser.urlencoded() ); // to support URL-encoded bodies
app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

var pgClient = new pg.Client(process.env.DATABASE_URL);
pgClient.connect();



//send and store buns or carrot location
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

	sender.send(message, recipients, 4, function(err, result) {});

	if(metaData) {
		updateMarkerMessage = message;
	} else {
		var loc = { latitude: latitude, longitude: longitude };
		cachedLocation[first_name] = loc;
	}
	pgClient.query('INSERT INTO cachedLocation (first_name, latitude, longitude, time, metaData) VALUES ($1, $2, $3, $4, $5)'
		,[first_name, latitude, longitude, new Date(), metaData], function(err, result) {});
};

//callback to end ajax cycle for bg geolocation
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
		var location = cachedLocation[username];
		if(first_name != username && location.latitude && location.longitude) {
			var message = new gcm.Message();
			message.addDataWithKeyValue('first_name', username);
			message.addDataWithKeyValue('latitude', location.latitude);
			message.addDataWithKeyValue('longitude', location.longitude);
			sender.send(message, recipients, 4, function(err, result) {});
		}
	}

	if(updateMarkerMessage) {
		sender.send(updateMarkerMessage, recipients, 4, function(err, result) {});
	}
};

var storeRegId = function(first_name, regid) {
	registeredUsers[first_name] = regid;
	pgClient.query('DELETE FROM registeredUsers WHERE first_name = \'' + first_name + '\'', function(err, result) {
		console.log("storeRegId: " + err + "\n" + result);
		pgClient.query('INSERT INTO registeredUsers (first_name, regId, time) VALUES ($1, $2, $3)'
		,[first_name, regid, new Date()], function(err, result) {});
	});
};

var removeMarker = function() {
	updateMarkerMessage = null;
	pgClient.query('DELETE FROM registeredUsers WHERE metadata IS NOT NULL', function(err, result) {});
};

app.get('/', function(request, response) {
  response.send('Hello World!');

	var queryData = url.parse(request.url, true).query;
	console.log("Get request:" + util.inspect(queryData, {colors: true, depth:4}));

	if(queryData.first_name &&
		queryData.first_name in registeredUsers) {
		//for new regid
		if(queryData.regid) {
			storeRegId(queryData.first_name, queryData.regid);
		}
		//for location updates
		if(queryData.latitude && queryData.longitude && cachedLocation[queryData.first_name] ) {
			sendLocation(queryData.first_name, queryData.latitude, queryData.longitude, queryData.metaData);
		}

		if(queryData.requestLocation) {
			getLocation(queryData.first_name);
		}

		if(queryData.removeMarker) {
			removeMarker();
		}
	}
});

app.post('/', function(request, response) {
	response.send('Hello World!');
	var queryData = request.body;
	console.log("Post Request: \n" + util.inspect(queryData, {colors: true, depth:4}));
	console.log("YOLO MOTHERFUCKER: " + queryData.first_name + " - " + queryData.location.latitude + ", " + queryData.location.longitude);

	cachedLocation[queryData.first_name] = queryData.location;
	backgroundGeolocationCallback(queryData.first_name, queryData.location);
	sendLocation(queryData.first_name, queryData.location.latitude, queryData.location.longitude);
});

app.get('/db', function (request, response) {
	var queryData = url.parse(request.url, true).query;
	console.log(util.inspect(queryData, {colors: true, depth:4}));

	pgClient.query('SELECT * FROM ' + queryData.db, function(err, result) {
		if (err) { console.error(err); response.send("Error " + err); }
		else { response.send(result.rows); } });
});

app.get('/dropTable', function(request, response) {
	var queryData = url.parse(request.url, true).query;
	console.log(util.inspect(queryData, {colors: true, depth:4}));

	pgClient.query('DROP TABLE ' + queryData.db, function(err, result) {
		if (err) { console.error(err); response.send("Error " + err); }
		else { response.send(result.rows); }});
});

app.get('/createTable', function (request, response) {
//	pgClient.query(
//			'CREATE TABLE registeredUsers (' +
//			'first_name text NOT NULL,' +
//			'regId text NOT NULL,' +
//			'time timestamp NOT NULL)'
//		, function(err, result) {
//			if (err) { console.error(err); response.send("Error " + err); }
//			else { response.send(result.rows); }
//	});
//
//	pgClient.query(
//		'CREATE TABLE cachedLocation (' +
//		'first_name text NOT NULL,' +
//		'latitude double precision NOT NULL,' +
//		'longitude double precision NOT NULL,' +
//		'time timestamp NOT NULL,' +
//		'metaData text)'
//		, function(err, result) {
//		if (err) { console.error(err); response.send("Error " + err); }
//		else { response.send(result.rows); }
//	});
});

app.get('/truncateDb', function (request, response) {
	truncateDb();
});
app.get('/readCache', function (request, response) {
	var s = "cachedLocation: \n" + JSON.stringify(cachedLocation) +
		"\n\nregisteredUsers: \n" + JSON.stringify(registeredUsers) +
		"\n\nupdateMarkerMessage\n: \'" + JSON.stringify(updateMarkerMessage);
	response.send(s);
});

var truncateDb = function() {
	pgClient.query('DELETE FROM cachedLocation WHERE (first_name !=  \'Kai\' AND first_name != \'Sarah\'', function(err, result) {
		console.log(err);
		console.log("Remove unauthorized: \n" + util.inspect(result, {colors: true, depth:4}));
	});
	pgClient.query('DELETE FROM cachedLocation WHERE ($1-time)/86400000 > 1', [new Date()], function(err, result) {
		console.log(err);
		console.log("Remove old: \n" + util.inspect(result, {colors: true, depth:4}));
	});
};

var readDbCache = function() {
	//cached locations
	for(var username in cachedLocation) {
		pgClient.query('SELECT * FROM cachedLocation WHERE first_name = \'' + username +
			'\' ORDER BY time DESC LIMIT 1', function(err, result) {
			if(!err && result.rows[0]) {
				var loc = {
					first_name: result.rows[0].first_name,
					latitude: result.rows[0].latitude,
					longitude: result.rows[0].longitude,
					time: result.rows[0].time
				};
				cachedLocation[result.rows[0].first_name] = loc;
				console.log("readDbcache: " + result.rows[0].first_name + " - " + util.inspect(cachedLocation[result.rows[0].first_name], {colors: true, depth:4}));
			}
		});
	}

	//RegIds
	for(var username in registeredUsers) {
		pgClient.query('SELECT * FROM registeredUsers WHERE first_name = \'' + username +
			'\' ORDER BY time DESC LIMIT 1', function(err, result) {
			console.log("readRegId: " + result.rows[0].first_name + " - " + util.inspect(result.rows[0], {colors: true, depth:4}));

			if(!err && result.rows[0]) {
				registeredUsers[result.rows[0].first_name] = result.rows[0].regid;
			}
		});
	}

	//update marker location
	pgClient.query('SELECT * FROM cachedLocation WHERE metadata IS NOT NULL' +
		' ORDER BY time DESC LIMIT 1', function(err, result) {
		if(!err && result.rows[0] && result.rows[0].metadata) {
			var message = new gcm.Message();
			message.addDataWithKeyValue('first_name', result.rows[0].first_name);
			message.addDataWithKeyValue('latitude', result.rows[0].latitude);
			message.addDataWithKeyValue('longitude', result.rows[0].longitude);
			message.addDataWithKeyValue('metaData', result.rows[0].metadata);
			updateMarkerMessage = message;
		}
	});
};

readDbCache();

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
});
