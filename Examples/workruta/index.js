#!/usr/bin/env node

/**
 * Module dependencies.
 */

var app = require('../app');
var debug = require('debug')('myapp:server');
var http = require('http');
var mysql = require('mysql');
var async = require('async');
var fs = require('fs');
var util = require('util');
var { JSDOM } = require('jsdom');
var dbCon = mysql.createConnection({
	host : '169.255.59.92',
	user : 'workruta',
	password : '|-7jw|ZV2:+F',
	database : 'workruta_database',
    acquireTimeout : 1000000,
    connectTimeout : 1000000,
    waitForConnections : true,
    queueLimit : 0
});
var mysqliQuery = dbCon.connect(function(err){
	console.log('Connecting to Database');
	if(!err)
		console.log('Database Connected');
	else
		console.log('Database Connection Failed');
});
var query = util.promisify(dbCon.query).bind(dbCon);
mysqliQuery.query("SELECT * FROM accounts");

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);
var { Server } = require("socket.io");
var io = new Server(server);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

io.engine.on("headers", (headers) => {
  headers["Access-Control-Allow-Private-Network"] = true;
});

String.prototype.stringToBoolean = function () {
	s = this.toLowerCase().trim();
    switch(s){
        case "true": 
        case "yes": 
        case "1": 
          return true;

        case "false": 
        case "no": 
        case "0": 
        case null: 
          return false;

        default: 
          return Boolean(this);
    }
};

Object.prototype.hasKey = function(key){
	keyValue = this[key];
	if(typeof keyValue == 'undefined')
		return false;
	else 
		return true;
};

io.sockets.on('connection', function (socket) {

	socket.on('connected', function(userID){
        
	})
	
	socket.on('disconnect', function(){
	});

	socket.on('disconnected', function(user){
	})
	
	socket.on('createRoute', function(emitObj){
		var user = emitObj.user;
		var locationFrom = emitObj.locationFrom;
		var locationTo = emitObj.locationTo;
		var latitudeFrom = emitObj.latitudeFrom;
		var longitudeFrom = emitObj.longitudeFrom;
		var latitudeTo = emitObj.latitudeTo;
		var longitudeTo = emitObj.longitudeTo;
		var routeDate = emitObj.routeDate;
		var date = emitObj.date;
		var time = emitObj.time;
		(async () => {			
			try {
				createRoute = await query("INSERT INTO routes VALUES('0', '"+user+"', '"+locationFrom+"', '"+locationTo+"', '"+latitudeFrom+"', '"+longitudeFrom+"', '"+latitudeTo+"', '"+longitudeTo+"', '"+routeDate+"', '"+date+"', 'false')");
				createRouteNewId = createRoute.insertId;
				dbCon.end();
				object = {
					id : createRouteNewId,
					time : time
				};
				socket.broadcast.emit('createRoute', object);
			} finally {
				dbCon.end();
			}
		})();
	})

})

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}
