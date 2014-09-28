var http = require('http');
var url = require('url');

var sendPush = function() {
  
};

var server = http.createServer(function(req, res) {
	res.writeHead(200);
	var queryData = url.parse(req.url, true).query;
	console.log(queryData);
	res.end('Hello Http');
});
server.listen(8080);

