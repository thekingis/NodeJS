const http = require('http'),
dns = require('dns'),
express = require('express'),
mysql = require('mysql'),
app = express(),
async = require('async'),
jsDom = require("jsdom"),
{ JSDOM } = jsDom,
util = require('util'),
port = 8000,
interval = 2000,
google = 'www.google.com',
server = http.createServer(app),
{ Server } = require('socket.io'),
io = new Server(server),
connect = mysql.createConnection({
	host : 'localhost',
	user : 'root',
	password : '',
	database : 'betaxix_database'
}),
query = util.promisify(connect.query).bind(connect);

server.listen(port, () => {
	console.log('NodeJS Server Running For BetAxix...');
	const games = new Games();
	games.start();
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.engine.on("headers", (headers) => {
  headers["Access-Control-Allow-Private-Network"] = true;
});

Object.prototype.hasKey = function(key){
	keyValue = this[key];
	return !(typeof keyValue == 'undefined');
};

io.sockets.on('connection', function (socket) {

	const userSocketID = socket.id;

	socket.on('connected', function(userID){
	});
	
	socket.on('disconnect', function(){
	});

	socket.on('disconnected', function(user){
	});
	
})

class Games {

	constructor(){}

	start() {
		const numberGame = new NumberGame();
		const colourGame = new ColourGame();
		const diceGame = new DiceGame();
		const fruitGame = new FruitGame();

		numberGame.start();
		colourGame.start();
		diceGame.start();
		fruitGame.start();
	}

}

class NumberGame {

	constructor(){}

	start() {
		
	}

}

class ColourGame {

	constructor(){
		this.black = 1;
		this.red = 6;
		this.green = 6;
		this.yellow = 6;
		this.timer;
		this.array = new Array();
		this.countDownSec = 60 * 4;
	}

	start() {
		setInterval(function(){

		}, 1000);
	}

	waitForGame(){
		this.timer = setInterval(function(){
			this.countDownSec--;
			if(this.countDownSec == 0){
				this.playGame();
			}
		}, 1000);
	}

	playGame(){
		clearInterval(this.timer);
		colorTimer = setInterval(function(){
		}, 2000);
	}

}

class DiceGame {

	constructor(){
		let oddArr = new Array();
		oddArr.push(1.1);
		oddArr.push(1.3);
		oddArr.push(1.5);
		oddArr.push(1.7);
		oddArr.push(1.9);
		oddArr.push(2.1);
		oddArr.push(2.4);
		oddArr.push(2.7);
		oddArr.push(3.0);
		oddArr.push(4.0);
		let codeObj = new Object();
		codeObj['2fxx'] = 0; //number to come
		codeObj['2fcx'] = 1; //number not to come
		codeObj['2fzx'] = 2; //correct score
		codeObj['2fvc'] = 3; //total score
		codeObj['2frx'] = 4; //twin number
		codeObj['2fvk'] = 5; //not twin
		codeObj['2fkx'] = 6; //over
		codeObj['2fzr'] = 7; //under
		let oddObj = new Object();
		oddObj['2fxx'] = 2.0; //number to come
		oddObj['2fcx'] = 1.5; //number not to come
		oddObj['2fzx'] = 4.0; //correct score
		oddObj['2fvc'] = 3.0; //total score
		oddObj['2frx'] = 2.0; //twin number
		oddObj['2fvk'] = 1.1; //not twin
		oddObj['2fkx'] = oddArr; //over
		oddObj['2fzr'] = oddArr.reverse(); //under
	}

	start(codeKey, codeIndex) {

		/*if(!codeObj.hasKey(codeKey)){
			// error for invalid key
			return;
		}

		let keyIndex = codeObj[codeKey];

		if(!(keyIndex == codeIndex)){
			// error for unmatched index
			return;
		}*/

	}

}

class FruitGame {

	constructor(){}

	start() {
		
	}

}