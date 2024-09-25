const http = require('http'),
dns = require('dns'),
express = require('express'),
mysql = require('mysql'),
app = express(),
async = require('async'),
jsDom = require("jsdom"),
{ JSDOM } = jsDom,
util = require('util'),
port = 8080,
interval = 2000,
google = 'www.google.com',
socketUsers = new Object(),
server = http.createServer(app),
{ Server } = require('socket.io'),
io = new Server(server),
charmap = { bs: '\\', ap: "'"},
connect = mysql.createConnection({
	host : 'localhost',
	user : 'root',
	password : '',
	database : 'whatsapp'
}),
query = util.promisify(connect.query).bind(connect);

server.listen(port, () => {
	console.log('NodeJS Server Running...');
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.engine.on("headers", (headers) => {
  headers["Access-Control-Allow-Private-Network"] = true;
});

Object.prototype.hasKey = function(key){
	keyValue = this[key];
	if(typeof keyValue == 'undefined')
		return false;
	else 
		return true;
};

io.sockets.on('connection', function (socket) {
	
	socket.on('connected', function(object){
		socketUsers[object.id.toString()] = socket.id;
		console.log(object.name+" is Connected");
	});
	
	socket.on('sendMessage', function(dataObj){
		userFrom = dataObj.myId;
		userTo = dataObj.chatUserId;
		name = dataObj.name;
		imageUrl = dataObj.imageUrl;
		message = dataObj.msgText.replace(/[']/g, "\\'");
		dateTime = dataObj.date;
		(async () => {
			try {
				msgId = await getMessageId(userFrom, userTo);
				await query("UPDATE startmsg SET userFromDate = '"+dateTime+"', userToDate = '"+dateTime+"', type = 'normal' WHERE id = "+msgId);
				await query("UPDATE allmsgs SET seen = '1' WHERE msgId = '"+msgId+"' AND userTo = '"+userFrom+"' AND seen = '0'");
				//await query("DELETE FROM archives WHERE user = '"+userFrom+"' AND msgId = '"+msgId+"'");
				insertQuery = await query("INSERT INTO allmsgs VALUES('0', '"+msgId+"', '"+userFrom+"', '"+userTo+"', '"+message+"', '', '', '0', '0', '0', '0', '"+dateTime+"', '0')");
				id = insertQuery.insertId;
				var emitObject = {
					id: id,
					msgId: msgId,
					name: name,
					imageUrl: imageUrl,
					userFrom: userFrom,
					userTo: userTo,
					message: message,
					dateTime: dateTime
				};
				var key = userTo.toString();
				if(socketUsers.hasKey(key)){
					var userSocket = socketUsers[key];
					socket.broadcast.to(userSocket).emit('receiveMessage', emitObject);
					return;
				}
			} finally {
			}
		})();
	});
	
});

function getMessageId(userOne, userTwo){
	return new Promise((resolve, reject) => {
		(async () => {
			try {
				myQuery = await query("SELECT id FROM startmsg WHERE (userFrom = '"+userOne+"' AND userTo = '"+userTwo+"') OR (userFrom = '"+userTwo+"' AND userTo = '"+userOne+"')");
				numRows = myQuery.length;
				if(numRows > 0)
					msgId = myQuery[0].id;
				else {
					date = new Date().toISOString().slice(0, 19).replace('T', ' ');
					myQuery = await query("INSERT INTO startmsg VALUES('0', '"+userOne+"', '"+userTwo+"', '"+date+"', '"+date+"', 'normal', '0')");
					msgId = myQuery.insertId;
				}
				resolve(msgId);
			} finally {
				//connect.end();
			}
		})();
	})
}
