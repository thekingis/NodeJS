const http = require('http'),
dns = require('dns'),
express = require('express'),
mysql = require('mysql'),
app = express(),
async = require('async'),
/*reqProNat = require('request-promise-native'),
fs = require('fs'),
htmlParser = require("htmlparser"),
/io = require('socket.io')(port),*/
jsDom = require("jsdom"),
{ JSDOM } = jsDom,
util = require('util'),
port = 8080,
interval = 2000,
google = 'www.google.com',
socketUsers = new Object(),
loggedInUsers = new Object(),
connectedReplyPages = new Object(),
connectedCommentPages = new Object(),
connectedMessagePages = new Object(),
connectedInboxPages = new Object(),
connectedProfilePages = new Object(),
connectedPagePages = new Object(),
pendingPromises = new Object(),
friendsArray = new Object(),
postObjects = new Object(),
postSockets = new Object(),
server = http.createServer(app),
{ Server } = require('socket.io'),
io = new Server(server),
connect = mysql.createConnection({
	host : 'localhost',
	user : 'root',
	password : '',
	database : 'pixtanta'
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
	friendsArray[socket.id] = new Array();

	socket.on('connected', function(userID){
		if(!(loggedInUsers.hasKey(userID)))
			loggedInUsers[userID] = new Array();
		loggedInUsers[userID].push(socket.id);
		socketUsers[socket.id] = userID;
		(async () => {
			try {
				queryStr = "SELECT * FROM (SELECT userTo AS user FROM friends WHERE userFrom = '"+userID+"' AND accepted = 'yes' UNION ";
				queryStr += "SELECT userFrom AS user FROM friends WHERE userTo = '"+userID+"' AND accepted = 'yes') AS t ";
				queryStr += "INNER JOIN accounts ON t.user = id";
				myQuery = "SELECT * FROM accounts WHERE id = '"+userID+"'";
				myData = await query(myQuery);
				queryData = await query(queryStr);
				user = myData[0].id;
				userName = myData[0].userName;
				photo = myData[0].photo;
				fName = myData[0].fName;
				lName = myData[0].lName;
				userDataArray = [user, userName, photo, fName, lName];
				emitSockets = new Array();
				for(i = 0; i < queryData.length; i++){
					userData = queryData[i];
					user = userData.user;
					if(!inArray(user, friendsArray[socket.id]))
						friendsArray[socket.id].push(user);
					if(loggedInUsers.hasKey(user) && connectedInboxPages.hasKey(user)){
						emitSockets = emitSockets.concat(connectedInboxPages[user]);
					}
				}
				emitSockets = emitSockets.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '';
				});
				for(i = 0; i < emitSockets.length; i++){
					emitSocketId = emitSockets[i];
					socket.broadcast.to(emitSocketId).emit('active', userDataArray);
				}
			} finally {
				//connect.end();
			}
		})();
	})

	socket.on('connectedInboxPages', function(myId){
		if(!(connectedInboxPages.hasKey(myId)))
			connectedInboxPages[myId] = new Array();
		connectedInboxPages[myId].push(socket.id);
		queryStr = "SELECT * FROM (SELECT userTo AS user FROM friends WHERE userFrom = '"+myId+"' AND accepted = 'yes' UNION ";
		queryStr += "SELECT userFrom AS user FROM friends WHERE userTo = '"+myId+"' AND accepted = 'yes') AS t ";
		queryStr += "INNER JOIN accounts ON t.user = id ORDER BY fName, lName, userName";
		(async () => {
			try {
				object = new Object();
				queryData = await query(queryStr);
				for(i = 0; i < queryData.length; i++){
					userData = queryData[i];
					user = userData.user;
					if(loggedInUsers.hasKey(user)){					
						userName = userData.userName;
						photo = userData.photo;
						fName = userData.fName;
						lName = userData.lName;
						userDataArray = [user, photo, fName, lName];
						object[userName] = userDataArray;	
					}
				}
				socket.emit('activeUsers', object);
			} finally {
				//connect.end();
			}
		})();
		socket.emit('connectedInboxPages', socket.id);
	})

	socket.on('connectedMessagePages', function(emitObj){
		userFrom = emitObj.userFrom;
		userTo = emitObj.userTo;
		if(!(connectedMessagePages.hasKey(userFrom)))
			connectedMessagePages[userFrom] = new Object();
		if(!(connectedMessagePages[userFrom].hasKey(userTo)))
			connectedMessagePages[userFrom][userTo] = new Array();
		connectedMessagePages[userFrom][userTo].push(socket.id);
		socket.emit('messagePageConnected', socket.id);
	})

	socket.on('connectedProfilePages', function(emitObj){
		userFrom = emitObj.userFrom;
		userTo = emitObj.userTo;
		if(!(connectedProfilePages.hasKey(userFrom)))
			connectedProfilePages[userFrom] = new Object();
		if(!(connectedProfilePages[userFrom].hasKey(userTo)))
			connectedProfilePages[userFrom][userTo] = new Array();
		connectedProfilePages[userFrom][userTo].push(socket.id);
		socket.emit('profilePageConnected', socket.id);
	})

	socket.on('connectedPagePages', function(emitObj){
		user = emitObj.user;
		pageId = emitObj.pageId;
		if(!(connectedPagePages.hasKey(user)))
			connectedPagePages[user] = new Object();
		if(!(connectedPagePages[user].hasKey(pageId)))
			connectedPagePages[user][pageId] = new Array();
		connectedPagePages[user][pageId].push(socket.id);
		socket.emit('pagePageConnected', socket.id);
	})

	socket.on('connectedCommentPage', function(emitObj){
		user = emitObj.user;
		postID = emitObj.postID;
		if(!(connectedCommentPages.hasKey(postID)))
			connectedCommentPages[postID] = new Object();
		if(!(connectedCommentPages[postID].hasKey(user)))
			connectedCommentPages[postID][user] = new Array();
		connectedCommentPages[postID][user].push(socket.id);
		socket.emit('connectedCommentPage', socket.id);
	})

	socket.on('connectedReplyPage', function(emitObj){
		user = emitObj.user;
		commentID = emitObj.commentID;
		if(!(connectedReplyPages.hasKey(commentID)))
			connectedReplyPages[commentID] = new Object();
		if(!(connectedReplyPages[commentID].hasKey(user)))
			connectedReplyPages[commentID][user] = new Array();
		connectedReplyPages[commentID][user].push(socket.id);
		socket.emit('pageConnected', socket.id);
	})
	
	socket.on('postScratch', function(postId){
		if(!(postObjects.hasKey(postId)))
			postObjects[postId] = new Array();
		postObjects[postId].push(socket.id);
		if(!(postSockets.hasKey(socket.id)))
			postSockets[socket.id] = new Array();
		postSockets[socket.id].push(postId);
	})
	
	socket.on('disconnect', function(){
		if(postSockets.hasKey(socket.id)){
			postSockets[socket.id].forEach(function(postId){
				if(postObjects.hasKey(postId)){
					if(inArray(socket.id, postObjects[postId]))
						postObjects[postId] = removeFromArray(socket.id, postObjects[postId]);
					if(postObjects[postId].length == 0)
						delete postObjects[postId];
				}
			})
			delete postSockets[socket.id];
		}
		if(socketUsers.hasKey(socket.id)){
			user = socketUsers[socket.id];
			delete socketUsers[socket.id];
			if(loggedInUsers.hasKey(user)){
				if(inArray(socket.id, loggedInUsers[user])){
					loggedInUsers[user] = removeFromArray(socket.id, loggedInUsers[user]);
					if(loggedInUsers[user].length == 0){
						delete loggedInUsers[user];
						emitSockets = new Array();
						(async () => {
							try {
							myQuery = "SELECT * FROM accounts WHERE id = '"+user+"'";
							myData = await query(myQuery);
							userName = myData[0].userName;
							for(i = 0; i < friendsArray[socket.id].length; i++){
								userTo = friendsArray[socket.id][i];
								if(connectedInboxPages.hasKey(userTo))
									emitSockets = emitSockets.concat(connectedInboxPages[userTo]);
							}
							emitSockets = emitSockets.filter(function(elem, index, selv){
								return index === selv.indexOf(elem) && elem != '';
							});
							for(i = 0; i < emitSockets.length; i++){
								emitSocketId = emitSockets[i];
								socket.broadcast.to(emitSocketId).emit('inactive', userName);
							}
							} finally {
								//connect.end();
							}
						})();
					}
				}
			}
		}
	});

	socket.on('removeReplyPage', function(emitObj){
		user = emitObj.user;
		commentID = emitObj.commentID;
		if(connectedReplyPages.hasKey(commentID)){
			if(connectedReplyPages[commentID].hasKey(user))
				connectedReplyPages[commentID][user] = removeFromArray(socket.id, connectedReplyPages[commentID][user]);
			if(connectedReplyPages[commentID][user].length == 0)
				delete connectedReplyPages[commentID][user];
			if(Object.keys(connectedReplyPages[commentID]).length == 0)
				delete connectedReplyPages[commentID];
		}
	})

	socket.on('removeCommentPage', function(emitObj){
		user = emitObj.user;
		postID = emitObj.postID;
		if(connectedCommentPages.hasKey(postID)){
			if(connectedCommentPages[postID].hasKey(user))
				connectedCommentPages[postID][user] = removeFromArray(socket.id, connectedCommentPages[postID][user]);
			if(typeof connectedCommentPages[postID][user] != 'undefined' && connectedCommentPages[postID][user].length == 0)
				delete connectedCommentPages[postID][user];
			if(Object.keys(connectedCommentPages[postID]).length == 0)
				delete connectedCommentPages[postID];
		}
	})

	socket.on('removeProfilePage', function(emitObj){
		userFrom = emitObj.userFrom;
		userTo = emitObj.userTo;
		if(connectedProfilePages.hasKey(userFrom)){
			if(connectedProfilePages[userFrom].hasKey(userTo)){
				if(inArray(socket.id, connectedProfilePages[userFrom][userTo])){
					connectedProfilePages[userFrom][userTo] = removeFromArray(socket.id, connectedProfilePages[userFrom][userTo]);
					if(connectedProfilePages[userFrom][userTo].length == 0)
						delete connectedProfilePages[userFrom][userTo];
					if(Object.keys(connectedProfilePages[userFrom]).length == 0)
						delete connectedProfilePages[userFrom];
				}
			}
		}
	})

	socket.on('removePagePage', function(emitObj){
		user = emitObj.user;
		pageId = emitObj.pageId;
		if(connectedPagePages.hasKey(user)){
			if(connectedPagePages[user].hasKey(pageId)){
				if(inArray(socket.id, connectedPagePages[user][pageId])){
					connectedPagePages[user][pageId] = removeFromArray(socket.id, connectedPagePages[user][pageId]);
					if(connectedPagePages[user][pageId].length == 0)
						delete connectedPagePages[user][pageId];
					if(Object.keys(connectedPagePages[user]).length == 0)
						delete connectedPagePages[user];
				}
			}
		}
	})

	socket.on('removeMessagePage', function(emitObj){
		userFrom = emitObj.userFrom;
		userTo = emitObj.userTo;
		if(connectedMessagePages.hasKey(userFrom)){
			if(connectedMessagePages[userFrom].hasKey(userTo)){
				if(inArray(socket.id, connectedMessagePages[userFrom][userTo])){
					connectedMessagePages[userFrom][userTo] = removeFromArray(socket.id, connectedMessagePages[userFrom][userTo]);
					if(connectedMessagePages[userFrom][userTo].length == 0)
						delete connectedMessagePages[userFrom][userTo];
					if(Object.keys(connectedMessagePages[userFrom]).length == 0)
						delete connectedMessagePages[userFrom];
				}
			}
		}
	})

	socket.on('removeInboxPage', function(user){
		if(connectedInboxPages.hasKey(user)){
			if(inArray(socket.id, connectedInboxPages[user])){
				connectedInboxPages[user] = removeFromArray(socket.id, connectedInboxPages[user]);
				if(connectedInboxPages[user].length == 0)
					delete connectedInboxPages[user];
			}
		}
	})

	socket.on('disconnected', function(user){
		if(postSockets.hasKey(socket.id)){
			postSockets[socket.id].forEach(function(postId){
				if(postObjects.hasKey(postId)){
					if(inArray(socket.id, postObjects[postId]))
						postObjects[postId] = removeFromArray(socket.id, postObjects[postId]);
					if(postObjects[postId].length == 0)
						delete postObjects[postId];
				}
			})
			delete postSockets[socket.id];
		}
		if(socketUsers.hasKey(socket.id))
			delete socketUsers[socket.id];
		if(loggedInUsers.hasKey(user)){
			if(inArray(socket.id, loggedInUsers[user])){
				loggedInUsers[user] = removeFromArray(socket.id, loggedInUsers[user]);
				if(loggedInUsers[user].length == 0)
					delete loggedInUsers[user];
			}
		}
		if(loggedInUsers.hasKey(user)){
			if(inArray(socket.id, loggedInUsers[user])){
				loggedInUsers[user] = removeFromArray(socket.id, loggedInUsers[user]);
				if(loggedInUsers[user].length == 0){
					delete loggedInUsers[user];
					emitSockets = new Array();
					(async () => {
						try {
							myQuery = "SELECT * FROM accounts WHERE id = '"+user+"'";
							myData = await query(myQuery);
							userName = myData[0].userName;
							for(i = 0; i < friendsArray[socket.id].length; i++){
								userTo = friendsArray[socket.id][i];
								if(connectedInboxPages.hasKey(userTo))
									emitSockets = emitSockets.concat(connectedInboxPages[userTo]);
							}
							emitSockets = emitSockets.filter(function(elem, index, selv){
								return index === selv.indexOf(elem) && elem != '';
							});
							for(i = 0; i < emitSockets.length; i++){
								emitSocketId = emitSockets[i];
								socket.broadcast.to(emitSocketId).emit('inactive', userName);
							}
						} finally {
							//connect.end();
						}
					})();
				}
			}
		}
	})

	socket.on('submitMessage', function(array){
		sendMessage(array);
	})

	socket.on('sendForwardMessage', function(array){
		usersTo = array.usersTo;
		userFrom = array.userFrom;
		delete array.usersTo;
		for(i = 0; i < usersTo.length; i++){
			userTo = usersTo[i];
			pendingPromises[socket.id] = new Object();
			pendingPromises[socket.id][userTo] = array;
		}
		sendForwardMessage();
	})

	socket.on('submitComment', function(emitArr){
		user = emitArr.user;
		postID = emitArr.postID;
		name = emitArr.name;
		userName = emitArr.userName;
		photo = emitArr.photo;
		verified = emitArr.verified;
		comment = emitArr.comment;
		type = emitArr.type;
		date = emitArr.date;
		count = emitArr.count;
		pagesName = new Object();
		pageNames = new Object();
		notifiers = new Array();
		mPages = new Array();
		tPages = new Array();
		(async () => {
			try {
				blockArray = await getBlockedArray(user);
				getType = await query("SELECT user FROM posts WHERE postType = 'profile' AND id = "+postID);
				if(getType.length == 1){
					pUser = getType[0].user;
					if(inArray(pUser, blockArray)){
						socket.emit('reverseSubmitComment', [postID, count]);
						return;
					}
				}
				dataFilter = getTags(comment, user, blockArray);
				tagsData = dataFilter.tagsData;
				comment = dataFilter.text;
				commentX = comment.replace(/[']/g, "\\'");
				taggedUsers = tagsData.mentionedUsers;
				taggedPages = tagsData.mentionedPages;
				mentionedUsers = taggedUsers.join(',');
				mentionedPages = taggedPages.join(',');
				insertQuery = await query("INSERT INTO comments VALUES('0', '"+user+"', '"+postID+"', '"+commentX+"', '"+mentionedUsers+"', '"+mentionedPages+"', '"+type+"', '0', '0', '"+date+"')");
				commentId = insertQuery.insertId;
				await query("INSERT INTO activities VALUES('0', '"+user+"', 1, '"+commentId+"', '"+date+"')");
				mysqlQuery = await query("SELECT * FROM `posts` WHERE id = " + postID);
				mysqlData = mysqlQuery[0];
				postUser = mysqlData.user;
				postType = mysqlData.postType;
				mentionedUsers = mysqlData.mentionedUsers;
				mentionedPages = mysqlData.mentionedPages;
				theName = 'your';
				xUser = user;
				if(type == 'page'){
					pageQuery = await query("SELECT * FROM `pages` WHERE id = " + user);
					pageData = pageQuery[0];
					xUser = pageData.user;
				}
				callId = 0;
				if(postType == 'page'){
					pageQuery = await query("SELECT * FROM `pages` WHERE id = " + postUser);
					pageData = pageQuery[0];
					callId = pageData.id;
					postUser = pageData.user;
					theName = '<b>'+pageData.name+'</b>';
				}
				notifiers.push(postUser);
				mentionedUsers = mentionedUsers.split(',');
				notifiers = notifiers.concat(taggedUsers);
				notifiers = notifiers.concat(mentionedUsers);
				mentionedPages = mentionedPages.split(',');
				taggedPages = taggedPages.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '';
				});
				mentionedPages = mentionedPages.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '';
				});
				if(taggedPages.length > 0){
					pageQuery = await query("SELECT * FROM `pages` WHERE id IN ("+taggedPages.join(',')+")");
					for(t = 0; t < pageQuery.length; t++){
						pageData = pageQuery[t];
						if(!(pagesName.hasKey(pageData.user)))
							pagesName[pageData.user] = [pageData.id, pageData.name];				
						tPages.push(pageData.user);	
						notifiers.push(pageData.user);
					}
				}
				if(mentionedPages.length > 0){
					pageQuery = await query("SELECT * FROM `pages` WHERE id IN ("+mentionedPages.join(',')+")");
					for(i = 0; i < pageQuery.length; i++){
						pageData = pageQuery[i];
						if(!(pageNames.hasKey(pageData.user)))
							pageNames[pageData.user] = [pageData.id, pageData.name];				
						mPages.push(pageData.user);	
						notifiers.push(pageData.user);
					}
				}
				fQuery = await query("SELECT id, user FROM `notifystatus` WHERE postId = '"+postID+"' UNION SELECT id, user FROM `comments` WHERE postId = '"+postID+"'");
				for(x = 0; x < fQuery.length; x++){
					fData = fQuery[x];
					notifiers.push(fData.user);
				}
				notifiers = notifiers.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '' && elem != xUser;
				});
				for(a = 0; a < notifiers.length; a++){
					userTo = notifiers[a];
					dataId = 0;
					action = 6;
					note = ' commented on a post you are following';
					if(inArray(userTo, mPages)){
						note = ' commented on a post <b>' + pageNames[userTo][1] + '</b> was tagged in';
						action = 3;
						dataId = pageNames[userTo][0];
					}
					if(inArray(userTo, mentionedUsers)){
						note = ' commented on a post you are tagged in';
						dataId = 0;
						action = 2;
					}
					if(inArray(userTo, tPages)){
						note = ' tagged <b>' + pagesName[userTo][1] + '</b> in a comment';
						action = 5;
						dataId = pagesName[userTo][0];
					}
					if(inArray(userTo, taggedUsers)){
						note = ' tagged you in a comment';
						dataId = 0;
						action = 4;
					}
					if(userTo == postUser){
						note = ' commented on ' + theName + ' post';
						action = 0;
						dataId = 0;
						if(postType == 'page'){
							dataId = callId;
							action = 1;
						}
					}
					note = '<b>' +name+ '</b>' + note;
					insertNote = await query("INSERT INTO `notifications` VALUES('0', '"+user+"', '"+userTo+"', 2, '"+action+"', '"+dataId+"', '"+commentId+"', 'false', 'false', '"+date+"')");
					id = insertNote.insertId;
					if(loggedInUsers.hasKey(userTo)){
						emitData = {
							isRequest : false,
							id : id,
							type : 2,
							action : action,
							dataId : dataId,
							noteId : commentId,
							extraId : postID,
							paramId : 0,
							note : note,
							photo : photo,
							userFrom : user,
							seen : false,
							date : "Just Now"
						};
						userSockets = loggedInUsers[userTo];
						userSockets = userSockets.filter(function(elem, index, selv){
							return index === selv.indexOf(elem) && elem != '';
						});
						for(b = 0; b < userSockets.length; b++){
							userSocketId = userSockets[b];
							socket.broadcast.to(userSocketId).emit('notify', emitData);
						}
					}
				}
				newArray = [commentId, postID, count, user, name, photo, userName, verified, comment, type];
				socket.emit('submitCommentId', [commentId, postID, count, comment]);
				if(postObjects.hasKey(postID)){
					emitSockets = postObjects[postID];
					emitSockets = emitSockets.filter(function(elem, index, selv){
						return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
					});
					for(i = 0; i < emitSockets.length; i++){
						emitSocketId = emitSockets[i];
						if(socketUsers.hasKey(emitSocketId)){
							iArray = newArray;
							bUser = socketUsers[emitSocketId];
							blockArrayX = await getBlockedArray(bUser);
							newCommentData = getTags(comment, bUser, blockArrayX);
							newComment = newCommentData['text'];
							iArray[8] = newComment;
						}
						socket.broadcast.to(emitSocketId).emit('submitComment', iArray);
					}
				}
				if(connectedCommentPages.hasKey(postID)){
					emitSocketObj = connectedCommentPages[postID];
					for(key in emitSocketObj){
						iArray = newArray;
						arr = emitSocketObj[key];
						blockArrayX = await getBlockedArray(key);
						newCommentData = getTags(comment, key, blockArrayX);
						newComment = newCommentData['text'];
						iArray[8] = newComment;
						emitSockets = arr.filter(function(elem, index, selv){
							return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
						});
						for(i = 0; i < arr.length; i++){
							emitSocketId = arr[i];
							socket.broadcast.to(emitSocketId).emit('submitComment', iArray);
						}
					}
				}
			} finally {
				//connect.end();
			}
		})();
	})

	socket.on('submitReply', function(emitArr){
		user = emitArr.user;
		postID = emitArr.postID;
		commentID = emitArr.commentID;
		name = emitArr.name;
		userName = emitArr.userName;
		photo = emitArr.photo;
		verified = emitArr.verified;
		comment = emitArr.comment;
		type = emitArr.type;
		date = emitArr.date;
		count = emitArr.count;
		pagesName = new Object();
		pageNames = new Object();
		notifiers = new Array();
		mPages = new Array();
		tPages = new Array();
		(async () => {
			try {
				blockArray = await getBlockedArray(user);
				getType = await query("SELECT user FROM comments WHERE type = 'profile' AND id = "+commentID);
				if(getType.length == 1){
					pUser = getType[0].user;
					if(inArray(pUser, blockArray)){
						socket.emit('reverseSubmitReply', count);
						return;
					}
				}
				dataFilter = getTags(comment, user, blockArray);
				tagsData = dataFilter.tagsData;
				comment = dataFilter.text;
				commentX = comment.replace(/[']/g, "\\'");
				taggedUsers = tagsData.mentionedUsers;
				taggedPages = tagsData.mentionedPages;
				mentionedUsers = taggedUsers.join(',');
				mentionedPages = taggedPages.join(',');
				insertRep = await query("INSERT INTO replies VALUES('0', '"+user+"', '"+commentID+"', '"+commentX+"', '"+mentionedUsers+"', '"+mentionedPages+"', '"+type+"', '0', '0', '"+date+"')");
				replyId = insertRep.insertId;
				await query("UPDATE comments SET relevance = relevance + 1 WHERE id = "+commentID);
				await query("INSERT INTO activities VALUES('0', '"+user+"', 2, '"+replyId+"', '"+date+"')");
				mysqlQuery = await query("SELECT * FROM `comments` WHERE id = " + commentID);
				mysqlData = mysqlQuery[0];
				postUser = mysqlData.user;
				postType = mysqlData.type;
				mentionedUsers = mysqlData.mentionedUsers;
				mentionedPages = mysqlData.mentionedPages;
				theName = 'your';
				callId = 0;
				xUser = user;
				if(type == 'page'){
					pageQuery = await query("SELECT * FROM `pages` WHERE id = " + user);
					pageData = pageQuery[0];
					xUser = pageData.user;						
				}
				if(postType == 'page'){
					pageQuery = await query("SELECT * FROM `pages` WHERE id = " + postUser);
					pageData = pageQuery[0];
					postUser = pageData.user;
					callId = pageData.id;
					theName = '<b>'+pageData.name+'</b>';
				}
				notifiers.push(postUser);
				mentionedUsers = mentionedUsers.split(',');
				notifiers = notifiers.concat(taggedUsers);
				notifiers = notifiers.concat(mentionedUsers);
				mentionedPages = mentionedPages.split(',');
				taggedPages = taggedPages.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '';
				});
				mentionedPages = mentionedPages.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '';
				});
				if(taggedPages.length > 0){
					pageQuery = await query("SELECT * FROM `pages` WHERE id IN ("+taggedPages.join(',')+")");
					for(t = 0; t < pageQuery.length; t++){
						pageData = pageQuery[t];
						if(!(pagesName.hasKey(pageData.user)))
							pagesName[pageData.user] = [pageData.id, pageData.name];				
						tPages.push(pageData.user);	
						notifiers.push(pageData.user);
					}
				}
				if(mentionedPages.length > 0){
					pageQuery = await query("SELECT * FROM `pages` WHERE id IN ("+mentionedPages.join(',')+")");
					for(i = 0; i < pageQuery.length; i++){
						pageData = pageQuery[i];
						if(!(pageNames.hasKey(pageData.user)))
							pageNames[pageData.user] = [pageData.id, pageData.name];				
						mPages.push(pageData.user);	
						notifiers.push(pageData.user);
					}
				}
				fQuery = await query("SELECT * FROM `replies` WHERE comId = '"+commentID+"'");
				for(x = 0; x < fQuery.length; x++){
					fData = fQuery[x];
					notifiers.push(fData.user);
				}
				notifiers = notifiers.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '' && elem != xUser;
				});
				for(a = 0; a < notifiers.length; a++){
					userTo = notifiers[a];
					action = 6;
					dataId = 0;
					note = ' replied to a comment you are following';
					if(inArray(userTo, mPages)){
						note = ' replied to a comment <b>' + pageNames[userTo][1] + '</b> was tagged in';
						dataId = pageNames[userTo][0];
						action = 3;
					}
					if(inArray(userTo, mentionedUsers)){
						note = ' replied to a comment you are tagged in';
						action = 2;
						dataId = 0;
					}
					if(inArray(userTo, tPages)){
						note = ' tagged <b>' + pagesName[userTo][1] + '</b> in a comment';
						dataId = pagesName[userTo][0];
						action = 5;
					}
					if(inArray(userTo, taggedUsers)){
						note = ' tagged you in a comment';
						action = 4;
						dataId = 0;
					}
					if(userTo == postUser){
						note = ' replied to ' + theName + ' comment';
						dataId = 0;
						action = 0;
						if(postType == 'page'){
							dataId = callId;
							action = 1;
						}
					}
					note = '<b>' +name+ '</b>' + note;
					insertNote = await query("INSERT INTO `notifications` VALUES('0', '"+user+"', '"+userTo+"', 3, '"+action+"', '"+dataId+"', '"+replyId+"', 'false', 'false', '"+date+"')");
					id = insertNote.insertId;
					if(loggedInUsers.hasKey(userTo)){
						emitData = {
							isRequest : false,
							id : id,
							type : 3,
							action : action,
							dataId : dataId,
							noteId : replyId,
							extraId : commentID,
							paramId : postID,
							note : note,
							photo : photo,
							userFrom : user,
							seen : false,
							date : "Just Now"
						};
						userSockets = loggedInUsers[userTo];
						userSockets = userSockets.filter(function(elem, index, selv){
							return index === selv.indexOf(elem) && elem != '';
						});
						for(b = 0; b < userSockets.length; b++){
							userSocketId = userSockets[b];
							socket.broadcast.to(userSocketId).emit('notify', emitData);
						}
					}
				}
				newArray = [replyId, commentID, count, user, name, photo, userName, verified, comment, postID, type];
				socket.emit('submitReplyId', [replyId, count, comment]);
				if(connectedReplyPages.hasKey(commentID)){
					for(key in connectedReplyPages[commentID]){
						iArray = newArray;
						arr = connectedReplyPages[commentID][key];
						blockArrayX = await getBlockedArray(key);
						newCommentData = getTags(comment, key, blockArrayX);
						newComment = newCommentData['text'];
						iArray[8] = newComment;
						emitSockets = arr.filter(function(elem, index, selv){
							return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
						});
						for(i = 0; i < emitSockets.length; i++){
							emitSocketId = emitSockets[i];
							socket.broadcast.to(emitSocketId).emit('submitReply', iArray);
						}
					}
				}
				if(connectedCommentPages.hasKey(postID)){
					for(key in connectedCommentPages[postID]){
						iArray = newArray;
						arr = connectedCommentPages[postID][key];
						blockArrayX = await getBlockedArray(key);
						newCommentData = getTags(comment, key, blockArrayX);
						newComment = newCommentData['text'];
						iArray[8] = newComment;
						emitSockets = arr.filter(function(elem, index, selv){
							return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
						});
						for(i = 0; i < emitSockets.length; i++){
							emitSocketId = emitSockets[i];
							socket.broadcast.to(emitSocketId).emit('submitReply', iArray);
						}
					}
				}
				if(postObjects.hasKey(postID)){
					emitSockets = postObjects[postID];
					emitSockets = emitSockets.filter(function(elem, index, selv){
						return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
					});
					for(i = 0; i < emitSockets.length; i++){
						iArray = newArray;
						emitSocketId = emitSockets[i];
						if(socketUsers.hasKey(emitSocketId)){
							bUser = socketUsers[emitSocketId];
							blockArrayX = await getBlockedArray(bUser);
							newCommentData = getTags(comment, bUser, blockArrayX);
							newComment = newCommentData['text'];
							iArray[8] = newComment;
						}
						socket.broadcast.to(emitSocketId).emit('submitReply', iArray);
					}					
				}
			} finally {
				//connect.end();
			}
		})();
	})

	socket.on('editComment', function(emitArr){
		user = emitArr.user;
		postID = emitArr.postId;
		comId = emitArr.comId;
		userName = emitArr.userName;
		comment = emitArr.comment;
		date = emitArr.date;
		pageNames = new Object();
		notifiers = new Array();
		tPages = new Array();
		rPages = new Array();
		(async () => {
			try {
				blockArray = await getBlockedArray(user);
				dataFilter = getTags(comment, user, blockArray);
				tagsData = dataFilter.tagsData;
				comment = dataFilter.text;
				commentX = comment.replace(/[']/g, "\\'");
				dataQuery = await query("SELECT * FROM `accounts` WHERE id = " + user);
				data = dataQuery[0];
				fName = data.fName;
				lName = data.lName;
				name = '<b>' + fName + ' ' + lName + '</b>';
				mysqlQuery = await query("SELECT * FROM `posts` WHERE id = " + postID);
				mysqlData = mysqlQuery[0];
				postUser = mysqlData.user;
				mUsers = mysqlData.mentionedUsers;
				mPages = mysqlData.mentionedPages;
				dataId = 0;
				mysqlQuery = await query("SELECT * FROM comments WHERE id = "+comId);
				mysqlData = mysqlQuery[0];
				type = mysqlData.type;
				if(type == 'page')
					dataId = 1;
				mUsers = mUsers.split(',');
				mPages = mPages.split(',');
				oldTaggedUsers = mysqlData.mentionedUsers.split(',');
				oldTaggedPages = mysqlData.mentionedPages.split(',');
				taggedUsers = tagsData.mentionedUsers;
				taggedPages = tagsData.mentionedPages;
				taggedUsers = taggedUsers.filter(x => !mUsers.includes(x));
				taggedPages = taggedPages.filter(x => !mPages.includes(x));
				oldTaggedUsers = oldTaggedUsers.filter(x => !mUsers.includes(x));
				oldTaggedPages = oldTaggedPages.filter(x => !mPages.includes(x));
				removedUsers = oldTaggedUsers.filter(x => !taggedUsers.includes(x));
				removedPages = oldTaggedPages.filter(x => !taggedPages.includes(x));
				addedUsers = taggedUsers.filter(x => !oldTaggedUsers.includes(x));
				addedPages = taggedPages.filter(x => !oldTaggedPages.includes(x));
				leftUsers = oldTaggedUsers.filter(x => taggedUsers.includes(x));
				leftPages = oldTaggedPages.filter(x => taggedPages.includes(x));
				taggedUsers = leftUsers.concat(addedUsers);
				taggedPages = leftPages.concat(addedPages);
				mentionedUsers = taggedUsers.join(',');
				mentionedPages = taggedPages.join(',');
				await query("UPDATE comments SET comment = '"+commentX+"', mentionedUsers = '"+mentionedUsers+"', mentionedPages = '"+mentionedPages+"' WHERE id = "+comId);
				await query("INSERT INTO activities VALUES('0', '"+user+"', 4, '"+comId+"', '"+date+"')");
				notifiers = notifiers.concat(addedUsers);
				removedUsers = removedUsers.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '' && elem != postUser;
				});
				addedPages = addedPages.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '';
				});
				removedPages = removedPages.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '';
				});
				if(removedUsers.length > 0)
					await query("DELETE FROM `notifications` WHERE userFrom = '"+user+"' AND userTo IN ("+removedUsers.join(',')+") AND type = '2' AND noteId = '"+comId+"'");
				if(removedPages.length > 0){
					pageQuery = await query("SELECT * FROM `pages` WHERE id IN ("+removedPages.join(',')+")");
					for(i = 0; i < pageQuery.length; i++){
						pageData = pageQuery[i];
						if(!(pageData.user == postUser))
							rPages.push(pageData.user);	
					}
					await query("DELETE FROM `notifications` WHERE userFrom = '"+user+"' AND userTo IN ("+rPages.join(',')+") AND type = '2' AND noteId = '"+comId+"'");
				}
				if(addedPages.length > 0){
					pageQuery = await query("SELECT * FROM `pages` WHERE id IN ("+addedPages.join(',')+")");
					for(i = 0; i < pageQuery.length; i++){
						pageData = pageQuery[i];
						if(!(pageNames.hasKey(pageData.user)))
							pageNames[pageData.user] = [pageData.id, pageData.name];				
						tPages.push(pageData.user);	
						notifiers.push(pageData.user);
					}
				}
				notifiers = notifiers.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '' && elem != postUser;
				});
				for(a = 0; a < notifiers.length; a++){
					userTo = notifiers[a];
					if((!(user == userTo) && type == 'profile') || (!(xUser == userTo) && type == 'page')){
						if(inArray(userTo, tPages)){
							note = ' tagged <b>' + pageNames[userTo][1] + '</b> in a comment';
							dataId = pageNames[userTo][0];
							action = 5;
						} else {
							note = ' tagged you in a comment';
							action = 4;
							dataId = 0;
						}
						note = '<b>' +name+ '</b>' + note;
						insertNote = await query("INSERT INTO `notifications` VALUES('0', '"+user+"', '"+userTo+"', 2, '"+action+"', '"+dataId+"', '"+comId+"', 'false', 'false', '"+date+"')");
						id = insertNote.insertId;
						if(loggedInUsers.hasKey(userTo)){
							emitData = {
								isRequest : false,
								id : id,
								type : 2,
								action : action,
								dataId : dataId,
								noteId : comId,
								extraId : 0,
								paramId : 0,
								note : note,
								photo : "",
								userFrom : user,
								seen : false,
								date : "Just Now"
							};
							userSockets = loggedInUsers[userTo];
							userSockets = userSockets.filter(function(elem, index, selv){
								return index === selv.indexOf(elem) && elem != '';
							});
							for(b = 0; b < userSockets.length; b++){
								userSocketId = userSockets[b];
								socket.broadcast.to(userSocketId).emit('notify', emitData);
							}
						}
					}
				}
				newArray = [comId, comment, userName];
				emitSockets = new Array();
				if(connectedReplyPages.hasKey(comId)){
					for(key in connectedReplyPages[comId]){
						arr = connectedReplyPages[comId][key];
						emitSockets = emitSockets.concat(arr);
					}
				}
				if(connectedCommentPages.hasKey(postID)){
					for(key in connectedCommentPages[postID]){
						arr = connectedCommentPages[postID][key];
						emitSockets = emitSockets.concat(arr);
					}
				}
				if(postObjects.hasKey(postID)){
					arr = postObjects[postID];
					emitSockets = emitSockets.concat(arr);
				}
				emitSockets = emitSockets.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
				});
				for(i = 0; i < emitSockets.length; i++){
					emitSocketId = emitSockets[i];
					socket.broadcast.to(emitSocketId).emit('editComment', newArray);
				}
			} finally {
				//connect.end();
			}
		})();
	})

	socket.on('editReply', function(emitArr){
		user = emitArr.user;
		repId = emitArr.repId;
		comId = emitArr.comId;
		comment = emitArr.reply;
		date = emitArr.date;
		pageNames = new Object();
		notifiers = new Array();
		tPages = new Array();
		rPages = new Array();
		(async () => {
			try {
				blockArray = await getBlockedArray(user);
				dataFilter = getTags(comment, user, blockArray);
				tagsData = dataFilter.tagsData;
				comment = dataFilter.text;
				commentX = comment.replace(/[']/g, "\\'");
				dataQuery = await query("SELECT * FROM `accounts` WHERE id = " + user);
				data = dataQuery[0];
				fName = data.fName;
				lName = data.lName;
				name = '<b>' + fName + ' ' + lName + '</b>';
				mysqlQuery = await query("SELECT * FROM comments WHERE id = "+comId);
				mysqlData = mysqlQuery[0];
				postUser = mysqlData.user;
				mUsers = mysqlData.mentionedUsers;
				mPages = mysqlData.mentionedPages;
				dataId = 0;
				mysqlQuery = await query("SELECT * FROM replies WHERE id = "+repId);
				mysqlData = mysqlQuery[0];
				type = mysqlData.type;
				if(type == 'page')
					dataId = 1;
				mUsers = mUsers.split(',');
				mPages = mPages.split(',');
				oldTaggedUsers = mysqlData.mentionedUsers.split(',');
				oldTaggedPages = mysqlData.mentionedPages.split(',');
				taggedUsers = tagsData.mentionedUsers;
				taggedPages = tagsData.mentionedPages;
				taggedUsers = taggedUsers.filter(x => !mUsers.includes(x));
				taggedPages = taggedPages.filter(x => !mPages.includes(x));
				oldTaggedUsers = oldTaggedUsers.filter(x => !mUsers.includes(x));
				oldTaggedPages = oldTaggedPages.filter(x => !mPages.includes(x));
				removedUsers = oldTaggedUsers.filter(x => !taggedUsers.includes(x));
				removedPages = oldTaggedPages.filter(x => !taggedPages.includes(x));
				addedUsers = taggedUsers.filter(x => !oldTaggedUsers.includes(x));
				addedPages = taggedPages.filter(x => !oldTaggedPages.includes(x));
				leftUsers = oldTaggedUsers.filter(x => taggedUsers.includes(x));
				leftPages = oldTaggedPages.filter(x => taggedPages.includes(x));
				taggedUsers = leftUsers.concat(addedUsers);
				taggedPages = leftPages.concat(addedPages);
				mentionedUsers = taggedUsers.join(',');
				mentionedPages = taggedPages.join(',');
				connect.query("UPDATE replies SET comment = '"+commentX+"', mentionedUsers = '"+mentionedUsers+"', mentionedPages = '"+mentionedPages+"' WHERE id = "+repId);
				await query("INSERT INTO activities VALUES('0', '"+user+"', 5, '"+repId+"', '"+date+"')");
				notifiers = notifiers.concat(addedUsers);
				removedUsers = removedUsers.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '' && elem != postUser;
				});
				addedPages = addedPages.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '';
				});
				removedPages = removedPages.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '';
				});
				if(removedUsers.length > 0)
					await query("DELETE FROM `notifications` WHERE userFrom = '"+user+"' AND userTo IN ("+removedUsers.join(',')+") AND type = '3' AND noteId = '"+repId+"'");
				if(removedPages.length > 0){
					pageQuery = await query("SELECT * FROM `pages` WHERE id IN ("+removedPages.join(',')+")");
					for(i = 0; i < pageQuery.length; i++){
						pageData = pageQuery[i];
						if(!(pageData.user == postUser))
							rPages.push(pageData.user);		
					}
					await query("DELETE FROM `notifications` WHERE userFrom = '"+user+"' AND userTo IN ("+rPages.join(',')+") AND type = '3' AND noteId = '"+repId+"'");
				}
				if(addedPages.length > 0){
					pageQuery = await query("SELECT * FROM `pages` WHERE id IN ("+addedPages.join(',')+")");
					for(i = 0; i < pageQuery.length; i++){
						pageData = pageQuery[i];
						if(!(pageNames.hasKey(pageData.user)))
							pageNames[pageData.user] = [pageData.id, pageData.name];				
						tPages.push(pageData.user);	
						notifiers.push(pageData.user);
					}
				}
				notifiers = notifiers.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '' && elem != postUser;
				});
				for(a = 0; a < notifiers.length; a++){
					userTo = notifiers[a];
					if((!(user == userTo) && type == 'profile') || (!(xUser == userTo) && type == 'page')){
						if(inArray(userTo, tPages)){
							note = ' tagged <b>' + pageNames[userTo][1] + '</b> in a comment';
							dataId = pageNames[userTo][0];
							action = 5;
						} else {
							note = ' tagged you in a comment';
							action = 4;
							dataId = 0;
						}
						note = '<b>' +name+ '</b>' + note;
						insertNote = await query("INSERT INTO `notifications` VALUES('0', '"+user+"', '"+userTo+"', 3, '"+action+"', '"+dataId+"', '"+repId+"', 'false', 'false', '"+date+"')");
						id = insertNote.insertId;
						if(loggedInUsers.hasKey(userTo)){
							emitData = {
								isRequest : false,
								id : id,
								type : 3,
								action : action,
								dataId : dataId,
								noteId : repId,
								extraId : 0,
								paramId : 0,
								note : note,
								photo : "",
								userFrom : user,
								seen : false,
								date : "Just Now"
							};
							userSockets = loggedInUsers[userTo];
							userSockets = userSockets.filter(function(elem, index, selv){
								return index === selv.indexOf(elem) && elem != '';
							});
							for(b = 0; b < userSockets.length; b++){
								userSocketId = userSockets[b];
								socket.broadcast.to(userSocketId).emit('notify', emitData);
							}
						}
					}
				}
				newArray = [repId, comment];
				if(connectedReplyPages.hasKey(comId)){
					for(key in connectedReplyPages[comId]){
						emitSockets = connectedReplyPages[comId][key];
						emitSockets = emitSockets.filter(function(elem, index, selv){
							return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
						});
						for(i = 0; i < emitSockets.length; i++){
							emitSocketId = emitSockets[i];
							socket.broadcast.to(emitSocketId).emit('editReply', newArray);
						}
					}
				}
			} finally {
				//connect.end();
			}
		})();
	})

	socket.on('notifyTags', function(emitObj){
		user = emitObj.user;
		mentionedUsers = emitObj.mentionedUsers;
		mentionedPages = emitObj.mentionedPages;
		postId = emitObj.postId;
		pageId = emitObj.pageId;
		type = emitObj.type;
		date = emitObj.date;
		(async () => {
			try {
				pageNames = new Object();
				mPages = new Array();
				notifiers = new Array();
				if(type == 'page'){				
					dataQuery = await query("SELECT * FROM `pages` WHERE id = " + pageId);
					data = dataQuery[0];
					name = data.name;
					theName = '<b>' + name + '</b>';	
				} else {
					dataQuery = await query("SELECT * FROM `accounts` WHERE id = " + user);
					data = dataQuery[0];
					fName = data.fName;
					lName = data.lName;
					theName = '<b>' + fName + ' ' + lName + '</b>';
				}
				notifiers = notifiers.concat(mentionedUsers);
				mentionedPages = mentionedPages.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '';
				});
				if(mentionedPages.length > 0){
					pageQuery = await query("SELECT * FROM `pages` WHERE id IN ("+mentionedPages.join(',')+")");
					for(i = 0; i < pageQuery.length; i++){
						pageData = pageQuery[i];
						if(!(pageNames.hasKey(pageData.user)))
							pageNames[pageData.user] = [pageData.id, pageData.name];				
						mPages.push(pageData.user);	
						notifiers.push(pageData.user);
					}
				}
				notifiers = notifiers.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '';
				});
				for(a = 0; a < notifiers.length; a++){
					userTo = notifiers[a];
					if(!(user == userTo)){
							if(inArray(userTo, mPages)){
								note = ' tagged <b>' + pageNames[userTo][1] + '</b> in a post';
								dataId = pageNames[userTo][0];
								action = 1;
							} else {
								note = ' tagged you in a post';
								action = 0;
								dataId = 0;
							}
							note = theName + note;
							insertNote = await query("INSERT INTO `notifications` VALUES('0', '"+user+"', '"+userTo+"', 0, '"+action+"', '"+dataId+"', '"+postId+"', 'false', 'false', '"+date+"')");
							id = insertNote.insertId;
							if(loggedInUsers.hasKey(userTo)){
								emitData = {
									isRequest : false,
									id : id,
									type : 0,
									action : action,
									dataId : 0,
									noteId : postId,
									extraId : 0,
									paramId : 0,
									note : note,
									photo : "",
									userFrom : user,
									seen : false,
									date : "Just Now"
								};
								userSockets = loggedInUsers[userTo];
								userSockets = userSockets.filter(function(elem, index, selv){
									return index === selv.indexOf(elem) && elem != '';
								});
								for(b = 0; b < userSockets.length; b++){
									userSocketId = userSockets[b];
									socket.broadcast.to(userSocketId).emit('notify', emitData);
								}
							}
						}
					}
			} finally {
				//connect.end();
			}
		})();
	})

	socket.on('deleteTags', function(emitObjX){
		userX = emitObjX.userX;
		mentionedUsersX = emitObjX.mentionedUsersX;
		mentionedPagesX = emitObjX.mentionedPagesX;
		postIdX = emitObjX.postIdX;
		(async () => {
			try {
				mPagesX = new Array();
				notifiersX = new Array();
				notifiersX = notifiersX.concat(mentionedUsersX);
				for(r = 0; r < mentionedPagesX.length; r++){
					if(mentionedPagesX[r] !== ''){
						pageQueryX = await query("SELECT * FROM `pages` WHERE id = " + mentionedPagesX[r]);
						pageDataX = pageQueryX[0];
						mPagesX.push(pageDataX.user);
						notifiersX.push(pageDataX.user);
					}
				}
				notifiersX = notifiersX.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '';
				});
				for(x = 0; x < notifiersX.length; x++){
					userToX = notifiersX[x];
					if(inArray(userToX, mPagesX))
						actionX = 1;
					else 
						actionX = 0;
					if(!(userX == userToX))
						await query("DELETE FROM `notifications` WHERE userFrom = '"+userX+"' AND userTo = '"+userToX+"' AND type = '0' AND action = '"+actionX+"' AND noteId = '"+postIdX+"'");
				}
			} finally {
				//connect.end();
			}
		})();
	})

	socket.on('savePost', function(emitObj){
		user = emitObj.user;
		postId = emitObj.postId;
		val = emitObj.val;
		date = emitObj.date;
		if(val){
			connect.query("DELETE FROM savedposts WHERE user = '"+user+"' AND postId = '"+postId+"'");
			connect.query("INSERT INTO activities VALUES('0', '"+user+"', 12, '"+postId+"', '"+date+"')");
		} else {
			connect.query("INSERT INTO savedposts VALUES('0', '"+user+"', '"+postId+"')");
			connect.query("INSERT INTO activities VALUES('0', '"+user+"', 11, '"+postId+"', '"+date+"')");
		}
	})

	socket.on('postLike', function(emitObj){
		user = emitObj.user;
		postId = emitObj.postId;
		tag = emitObj.tag;
		date = emitObj.date;
		(async () => {
			try {
				mysqlQuery = await query("SELECT * FROM `posts` WHERE id = " + postId);
				mysqlData = mysqlQuery[0];
				postUser = mysqlData.user;
				postType = mysqlData.postType;
				if(postType == 'profile'){
					blocked = await isBlocked(user, postUser);
					if(blocked){
						subtract = tag == 0;
						socket.emit('reversePostLike', [postId, subtract]);
						return;
					}
				}
				pageNames = new Object();
				notifiers = new Array();
				mPages = new Array();
				dataQuery = await query("SELECT * FROM `accounts` WHERE id = " + user);
				data = dataQuery[0];
				fName = data.fName;
				lName = data.lName;
				theName = '<b>' + fName + ' ' + lName + '</b>';
				mentionedUsers = mysqlData.mentionedUsers;
				mentionedPages = mysqlData.mentionedPages;
				callId = 0;
				name = 'your';
				if(postType == 'page'){
					pageQuery = await query("SELECT * FROM `pages` WHERE id = " + postUser);
					pageData = pageQuery[0];
					postUser = pageData.user;
					callId = pageData.id;
					name = '<b>'+pageData.name+'</b>';
				}
				notifiers.push(postUser);
				mentionedUsers = mentionedUsers.split(',');
				notifiers = notifiers.concat(mentionedUsers);
				mentionedPages = mentionedPages.split(',');
				mentionedPages = mentionedPages.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '';
				});
				if(mentionedPages.length > 0){
					pageQuery = await query("SELECT * FROM `pages` WHERE id IN ("+mentionedPages.join(',')+")");
					for(i = 0; i < pageQuery.length; i++){
						pageData = pageQuery[i];
						if(!(pageNames.hasKey(pageData.user)))
							pageNames[pageData.user] = [pageData.id, pageData.name];				
						mPages.push(pageData.user);	
						notifiers.push(pageData.user);
					}
				}
				fQuery = await query("SELECT * FROM `notifystatus` WHERE postId = " + postId);
				for(x = 0; x < fQuery.length; x++){
					fData = fQuery[x];
					notifiers.push(fData.user);
				}
				notifiers = notifiers.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '' && elem != '';
				});
				if(tag == 0){
					likeNum = 1;
					await query("INSERT INTO postlike VALUES('0', '"+user+"', '"+postId+"')");
					await query("INSERT INTO activities VALUES('0', '"+user+"', 6, '"+postId+"', '"+date+"')");
					for(a = 0; a < notifiers.length; a++){
						userTo = notifiers[a];
						if(!(user == userTo)){
							action = 4;
							dataId = 0;
							note = ' likes a post you are following';
							if(inArray(userTo, mPages)){
								note = ' likes a post <b>' + pageNames[userTo][1] + '</b> was tagged in';
								dataId = pageNames[userTo][0];
								action = 3;
							}
							if(inArray(userTo, mentionedUsers)){
								note = ' likes a post you are tagged in';
								action = 2;
								dataId = 0;
							}
							if(userTo == postUser){
								note = ' likes ' + name + ' post';
								action = 0;
								dataId = 0;
								if(postType == 'page'){
									dataId = callId;
									action = 1;
								}
							}
							note = theName + note;
							insertQuery = await query("INSERT INTO `notifications` VALUES('0', '"+user+"', '"+userTo+"', 1, '"+action+"', '"+dataId+"', '"+postId+"', 'false', 'false', '"+date+"')");
							id = insertQuery.insertId;
							if(loggedInUsers.hasKey(userTo)){
								emitData = {
									isRequest : false,
									id : id,
									type : 1,
									action : action,
									dataId : dataId,
									noteId : postId,
									extraId : 0,
									paramId : 0,
									note : note,
									photo : "",
									userFrom : user,
									seen : false,
									date : "Just Now"
								};
								userSockets = loggedInUsers[userTo];
								userSockets = userSockets.filter(function(elem, index, selv){
									return index === selv.indexOf(elem) && elem != '';
								});
								for(b = 0; b < userSockets.length; b++){
									userSocketId = userSockets[b];
									socket.broadcast.to(userSocketId).emit('notify', emitData);
								}
							}
						}
					}
				} else {
					likeNum = -1;
					await query("DELETE FROM postlike WHERE user = '"+user+"' AND postId = '"+postId+"'");
					await query("INSERT INTO activities VALUES('0', '"+user+"', 7, '"+postId+"', '"+date+"')");
					for(a = 0; a < notifiers.length; a++){
						userTo = notifiers[a];
						action = 4;
						dataId = 0;
						if(inArray(userTo, mPages)){
							dataId = pageNames[userTo][0];
							action = 3;
						}
						if(inArray(userTo, mentionedUsers)){
							dataId = 0;
							action = 2;
						}
						if(userTo == postUser){
							action = 0;
							dataId = 0;
							if(postType == 'page'){
								dataId = callId;
								action = 1;
							}
						}
						if(!(user == userTo))
							await query("DELETE FROM `notifications` WHERE userFrom = '"+user+"' AND userTo = '"+userTo+"' AND type = '1' AND action = '"+action+"' AND dataId = '"+dataId+"' AND noteId = '"+postId+"'");
					}
				}
				newArray = [postId, likeNum];
				newArrayX = [postId, likeNum, user, tag];
				if(postObjects.hasKey(postId)){
					emitSockets = postObjects[postId];
					emitSockets = emitSockets.filter(function(elem, index, selv){
						return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
					});
					for(i = 0; i < emitSockets.length; i++){
						emitSocketId = emitSockets[i];
						emitter = 'postLike';
						emitArr = newArray;
						if(socketUsers.hasKey(emitSocketId) && socketUsers[emitSocketId] == user){
							emitter = 'postLikeX';
							emitArr = newArrayX;
						}
						socket.broadcast.to(emitSocketId).emit(emitter, emitArr);
					}					
				}
			} finally {
				//connect.end();
			}
		})();
	})

	socket.on('commentLike', function(emitObj){
		user = emitObj.user;
		comId = emitObj.comId;
		postId = emitObj.postId;
		tag = emitObj.tag;
		date = emitObj.date;
		(async () => {
			try {
				mysqlQuery = await query("SELECT * FROM `comments` WHERE id = " + comId);
				mysqlData = mysqlQuery[0];
				postUser = mysqlData.user;
				postType = mysqlData.type;
				if(postType == 'profile'){
					blocked = await isBlocked(user, postUser);
					if(blocked){
						subtract = tag == 0;
						socket.emit('reverseCommentLike', [comId, subtract]);
						return;
					}
				}
				pageNames = new Object();
				notifiers = new Array();
				mPages = new Array();
				dataQuery = await query("SELECT * FROM `accounts` WHERE id = " + user);
				data = dataQuery[0];
				fName = data.fName;
				lName = data.lName;
				name = '<b>' + fName + ' ' + lName + '</b>';
				mentionedUsers = mysqlData.mentionedUsers;
				mentionedPages = mysqlData.mentionedPages;
				theName = 'your';
				callId = 0;
				if(postType == 'page'){
					pageQuery = await query("SELECT * FROM `pages` WHERE id = " + postUser);
					pageData = pageQuery[0];
					postUser = pageData.user;
					callId = pageData.id;
					theName = '<b>'+pageData.name+'</b>';
				}
				notifiers.push(postUser);
				mentionedUsers = mentionedUsers.split(',');
				notifiers = notifiers.concat(mentionedUsers);
				mentionedPages = mentionedPages.split(',');
				mentionedPages = mentionedPages.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '';
				});
				if(mentionedPages.length > 0){
					pageQuery = await query("SELECT * FROM `pages` WHERE id IN ("+mentionedPages.join(',')+")");
					for(i = 0; i < pageQuery.length; i++){
						pageData = pageQuery[i];
						if(!(pageNames.hasKey(pageData.user)))
							pageNames[pageData.user] = [pageData.id, pageData.name];				
						mPages.push(pageData.user);	
						notifiers.push(pageData.user);
					}
				}
				notifiers = notifiers.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '';
				});
				if(tag == 0){
					likeNum = 1;
					await query("INSERT INTO comlike VALUES('0', '"+user+"', '"+comId+"', '"+postId+"')");
					await query("UPDATE comments SET relevance = relevance + 1 WHERE id = "+comId);
					await query("INSERT INTO activities VALUES('0', '"+user+"', 8, '"+comId+"', '"+date+"')");
					for(a = 0; a < notifiers.length; a++){
						userTo = notifiers[a];
						if(!(user == userTo)){
							if(inArray(userTo, mPages)){
								note = ' likes a comment <b>' + pageNames[userTo][1] + '</b> was tagged in';
								dataId = pageNames[userTo][0];
								action = 8;
							}
							if(inArray(userTo, mentionedUsers)){
								note = ' likes a comment you are tagged in';
								dataId = 0;
								action = 7;
							}
							if(userTo == postUser){
								note = ' likes '+theName+' comment';
								dataId = 0;
								action = 5;
								if(postType == 'page'){
									dataId = callId;
									action = 6;
								}
							}
							note = name + note;
							insertNote = await query("INSERT INTO `notifications` VALUES('0', '"+user+"', '"+userTo+"', 1, '"+action+"', '"+dataId+"', '"+comId+"', 'false', 'false', '"+date+"')");
							id = insertNote.insertId;
							if(loggedInUsers.hasKey(userTo)){
								emitData = {
									isRequest : false,
									id : id,
									type : 1,
									action : action,
									dataId : dataId,
									noteId : comId,
									extraId : postId,
									extraId : 0,
									paramId : 0,
									note : note,
									photo : "",
									userFrom : user,
									seen : false,
									date : "Just Now"
								};
								userSockets = loggedInUsers[userTo];
								userSockets = userSockets.filter(function(elem, index, selv){
									return index === selv.indexOf(elem) && elem != '';
								});
								for(b = 0; b < userSockets.length; b++){
									userSocketId = userSockets[b];
									socket.broadcast.to(userSocketId).emit('notify', emitData);
								}
							}
						}
					}
				} else {
					likeNum = -1;
					await query("DELETE FROM comlike WHERE user = '"+user+"' AND comId = '"+comId+"' AND postId = '"+postId+"'");
					await query("INSERT INTO activities VALUES('0', '"+user+"', 9, '"+comId+"', '"+date+"')");
					await query("UPDATE comments SET relevance = relevance - 1 WHERE id = "+comId);
					for(a = 0; a < notifiers.length; a++){
						userTo = notifiers[a];
						if(inArray(userTo, mPages)){
							dataId = pageNames[userTo][0];
							action = 8;
						}
						if(inArray(userTo, mentionedUsers)){
							dataId = 0;
							action = 7;
						}
						if(userTo == postUser){
							dataId = 0;
							action = 5;
							if(postType == 'page'){
								dataId = callId;
								action = 6;
							}
						}
						if(!(user == userTo))
							await query("DELETE FROM `notifications` WHERE userFrom = '"+user+"' AND userTo = '"+userTo+"' AND type = '1' AND action = '"+action+"' AND dataId = '"+dataId+"' AND noteId = '"+comId+"'");
					}
				}
				newArray = [comId, likeNum, user, tag];
				emitSockets = new Array();
				if(connectedReplyPages.hasKey(comId)){
					for(key in connectedReplyPages[comId]){
						emitSockets = emitSockets.concat(connectedReplyPages[comId][key]);
					}
				}
				if(connectedCommentPages.hasKey(postID)){
					for(key in connectedCommentPages[postID]){
						emitSockets = emitSockets.concat(connectedCommentPages[postID][key]);
					}
				}
				if(postObjects.hasKey(postID)){
					arr = postObjects[postID];
					emitSockets = emitSockets.concat(arr);
				}
				emitSockets = emitSockets.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
				});
				for(i = 0; i < emitSockets.length; i++){
					userSocketId = emitSockets[i];
					socket.broadcast.to(userSocketId).emit('commentLike', newArray);
				}
			} finally {
				//connect.end();
			}
		})();
	})

	socket.on('replyLike', function(emitObj){
		user = emitObj.user;
		comId = emitObj.comId;
		postId = emitObj.postId;
		replyId = emitObj.replyId;
		tag = emitObj.tag;
		date = emitObj.date;
		(async () => {
			try {
				mysqlQuery = await query("SELECT * FROM `replies` WHERE id = " + replyId);
				mysqlData = mysqlQuery[0];
				postUser = mysqlData.user;
				postType = mysqlData.type;
				if(postType == 'profile'){
					blocked = await isBlocked(user, postUser);
					if(blocked){
						subtract = tag == 0;
						socket.emit('reverseReplyLike', [replyId, subtract]);
						return;
					}
				}
				pageNames = new Object();
				notifiers = new Array();
				mPages = new Array();
				dataQuery = await query("SELECT * FROM `accounts` WHERE id = " + user);
				data = dataQuery[0];
				fName = data.fName;
				lName = data.lName;
				name = '<b>' + fName + ' ' + lName + '</b>';
				mentionedUsers = mysqlData.mentionedUsers;
				mentionedPages = mysqlData.mentionedPages;
				theName = 'your';
				callId = 0;
				if(postType == 'page'){
					pageQuery = await query("SELECT * FROM `pages` WHERE id = " + postUser);
					pageData = pageQuery[0];
					postUser = pageData.user;
					callId = pageData.id;
					theName = '<b>'+pageData.name+'</b>';
				}
				notifiers.push(postUser);
				mentionedUsers = mentionedUsers.split(',');
				notifiers = notifiers.concat(mentionedUsers);
				mentionedPages = mentionedPages.split(',');
				mentionedPages = mentionedPages.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '';
				});
				if(mentionedPages.length > 0){
					pageQuery = await query("SELECT * FROM `pages` WHERE id IN ("+mentionedPages.join(',')+")");
					for(i = 0; i < pageQuery.length; i++){
						pageData = pageQuery[i];
						if(!(pageNames.hasKey(pageData.user)))
							pageNames[pageData.user] = [pageData.id, pageData.name];				
						mPages.push(pageData.user);	
						notifiers.push(pageData.user);
					}
				}
				notifiers = notifiers.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '';
				});
				if(tag == 0){
					likeNum = 1;
					await query("INSERT INTO replike VALUES('0', '"+user+"', '"+replyId+"', '"+comId+"', '"+postId+"')");
					await query("UPDATE replies SET relevance = relevance + 1 WHERE id = "+replyId);
					await query("INSERT INTO activities VALUES('0', '"+user+"', 10, '"+replyId+"', '"+date+"')");
					for(a = 0; a < notifiers.length; a++){
						userTo = notifiers[a];
						if(!(user == userTo)){
							if(inArray(userTo, mPages)){
								note = ' likes a reply <b>' + pageNames[userTo][1] + '</b> was tagged in';
								dataId = pageNames[userTo][0];
								action = 12;
							}
							if(inArray(userTo, mentionedUsers)){
								note = ' likes a reply you are tagged in';
								dataId = 0;
								action = 11;
							}
							if(userTo == postUser){
								note = ' likes '+theName+' reply';
								dataId = 0;
								action = 9;
								if(postType == 'page'){
									dataId = callId;
									action = 10;
								}
							}
							note = name + note;
							insertNote = await query("INSERT INTO `notifications` VALUES('0', '"+user+"', '"+userTo+"', 1, '"+action+"', '"+dataId+"', '"+replyId+"', 'false', 'false', '"+date+"')");
							id = insertNote.insertId;
							if(loggedInUsers.hasKey(userTo)){
								emitData = {
									isRequest : false,
									id : id,
									type : 1,
									action : action,
									dataId : dataId,
									noteId : replyId,
									extraId : comId,
									paramId : postId,
									extraId : 0,
									paramId : 0,
									note : note,
									photo : "",
									userFrom : user,
									seen : false,
									date : "Just Now"
								};
								userSockets = loggedInUsers[userTo];
								userSockets = userSockets.filter(function(elem, index, selv){
									return index === selv.indexOf(elem) && elem != '';
								});
								for(b = 0; b < userSockets.length; b++){
									userSocketId = userSockets[b];
									socket.broadcast.to(userSocketId).emit('notify', emitData);
								}
							}
						}
					}
				} else {
					likeNum = -1;
					await query("DELETE FROM replike WHERE user = '"+user+"' AND repId = '"+replyId+"' AND comId = '"+comId+"' AND postId = '"+postId+"'");
					await query("UPDATE replies SET relevance = relevance - 1 WHERE id = "+replyId);
					await query("INSERT INTO activities VALUES('0', '"+user+"', 11, '"+replyId+"', '"+date+"')");
					for(a = 0; a < notifiers.length; a++){
						userTo = notifiers[a];
						if(inArray(userTo, mPages)){
							dataId = pageNames[userTo][0];
							action = 12;
						}
						if(inArray(userTo, mentionedUsers)){
							dataId = 0;
							action = 11;
						}
						if(userTo == postUser){
							dataId = 0;
							action = 9;
							if(postType == 'page'){
								dataId = callId;
								action = 10;
							}
						}
						await query("DELETE FROM `notifications` WHERE userFrom = '"+user+"' AND userTo = '"+userTo+"' AND type = '1' AND action = '"+action+"' AND dataId = '"+dataId+"' AND noteId = '"+replyId+"'");
					}
				}
				newArray = [replyId, likeNum, user, tag];
				emitSockets = new Array();
				if(connectedReplyPages.hasKey(comId)){
					for(key in connectedReplyPages[comId]){
						emitSockets = emitSockets.concat(connectedReplyPages[comId][key]);
					}
				}
				emitSockets = emitSockets.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
				});
				for(i = 0; i < emitSockets.length; i++){
					userSocketId = emitSockets[i];
					socket.broadcast.to(userSocketId).emit('replyLike', newArray);
				}
			} finally {
				//connect.end();
			}
		})();
	})

	socket.on('seenMsg', function(emitObj){
		userFrom = emitObj.userFrom;
		userTo = emitObj.userTo;
		msgId = emitObj.msgId;
		(async () => {
			try {
				updateQuery = await query("UPDATE allmsgs SET seen = '1', popped = '1' WHERE msgId = '"+msgId+"' AND userTo = '"+userFrom+"' AND seen = '0'");
				nuwRows = updateQuery.affectedRows;
				if(nuwRows > 0){
					emitSockets = new Array();
					newArray = [userFrom, userTo, msgId];
					if(connectedMessagePages.hasKey(userTo)){
						if(connectedMessagePages[userTo].hasKey(userFrom))
							emitSockets = emitSockets.concat(connectedMessagePages[userTo][userFrom]);
					}
					if(connectedInboxPages.hasKey(userTo))
						emitSockets = emitSockets.concat(connectedInboxPages[userTo]);
					if(connectedInboxPages.hasKey(userFrom))
						emitSockets = emitSockets.concat(connectedInboxPages[userFrom]);
					emitSockets = emitSockets.filter(function(elem, index, selv){
						return index === selv.indexOf(elem) && elem != '';
					});
					for(i = 0; i < emitSockets.length; i++){
						emitSocketId = emitSockets[i];
						socket.broadcast.to(emitSocketId).emit('seenMsg', newArray);
					}
				}
			} finally {
				//connect.end();
			}
		})();
	})

	socket.on('msgDelivered', function(user){
		queryStr = "SELECT * FROM allmsgs WHERE userTo = '"+user+"' AND dlvd = '0'";
		(async () => {
			try {
				queryDataArr = await query(queryStr);
				await query("UPDATE allmsgs SET dlvd = '1' WHERE userTo = '"+user+"' AND dlvd = '0'");
				for(x = 0; x < queryDataArr.length; x++){
					emitSockets = new Array();
					msgId = queryDataArr[x].msgId;
					userTo = queryDataArr[x].userFrom;
					if(connectedMessagePages.hasKey(userTo)){
						if(connectedMessagePages[userTo].hasKey(user))
							emitSockets = emitSockets.concat(connectedMessagePages[userTo][user]);
					}
					if(connectedInboxPages.hasKey(userTo))
						emitSockets = emitSockets.concat(connectedInboxPages[userTo]);
					emitSockets = emitSockets.filter(function(elem, index, selv){
						return index === selv.indexOf(elem) && elem != '';
					});
					for(i = 0; i < emitSockets.length; i++){
						emitSocketId = emitSockets[i];
						socket.broadcast.to(emitSocketId).emit('msgDelivered', msgId);
					}
				}
			} finally {
				//connect.end();
			}
		})()
	})

	socket.on('popped', function(emitObj){
		user = emitObj.user;
		tabs = emitObj.tabs;
		(async () => {
			try {
				for(x = 0; x < tabs.length; x++)
					connect.query("UPDATE "+tabs[x]+" SET popped = '1' WHERE userTo = '"+user+"' AND popped = '0'");
				emitSockets = new Array();
				if(loggedInUsers.hasKey(user))
					emitSockets = emitSockets.concat(loggedInUsers[user]);
				emitSockets = emitSockets.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
				});
				for(i = 0; i < emitSockets.length; i++){
					emitSocketId = emitSockets[i];
					socket.broadcast.to(emitSocketId).emit('popped', tab);
				}
			} finally {
				//connect.end();
			}
		})();
	})

	socket.on('typing', function(emitObj){
		userFrom = emitObj.userFrom;
		userTo = emitObj.userTo;
		msgId = emitObj.msgId;
		typing = emitObj.typing;
		emitSockets = new Array();
		if(connectedMessagePages.hasKey(userTo)){
			if(connectedMessagePages[userTo].hasKey(userFrom))
				emitSockets = emitSockets.concat(connectedMessagePages[userTo][userFrom]);
		}
		if(connectedInboxPages.hasKey(userTo))
			emitSockets = emitSockets.concat(connectedInboxPages[userTo]);
		emitSockets = emitSockets.filter(function(elem, index, selv){
			return index === selv.indexOf(elem) && elem != '';
		});
		for(i = 0; i < emitSockets.length; i++){
			emitSocketId = emitSockets[i];
			socket.broadcast.to(emitSocketId).emit('typing', emitObj);
		}
	})

	socket.on('deleteMessage', function(emitObj){
		userFrom = emitObj.userFrom;
		userTo = emitObj.userTo;
		id = emitObj.id;
		msgId = emitObj.msgId;
		deletable = emitObj.deletable;
		executeMessageDelete(id, msgId, userFrom, userTo, deletable, emitObj);
	})

	socket.on('deletePendingMessage', function(emitObj){
		userFrom = emitObj.userFrom;
		msgId = emitObj.msgId;
		userTo = emitObj.userTo;
		deletable = emitObj.deletable;
		time = emitObj.time;
		(async () => {
			try {
				msgDtls = await query("SELECT * FROM allmsgs WHERE msgId = '"+msgId+"' AND userFrom = '"+userFrom+"' AND time = '"+time+"'");
				id = msgDtls[0].id;
				emitObj['id'] = id;
				executeMessageDelete(id, msgId, userFrom, userTo, deletable, emitObj);
			} finally {
				//connect.end();
			}
		})();
	})

	socket.on('deleteComment', function(emitObj){
		user = emitObj.user;
		comId = emitObj.comId;
		postId = emitObj.postId;
		date = emitObj.date;
		(async () => {
			try {
				await query("DELETE FROM comments WHERE user = '"+user+"' AND id = '"+comId+"' AND postId = '"+postId+"'");
				await query("DELETE FROM replies WHERE comId = '"+comId+"'");
				await query("DELETE FROM comlike WHERE comId = '"+comId+"'");
				await query("DELETE FROM replike WHERE comId = '"+comId+"'");
				await query("DELETE FROM `notifications` WHERE userFrom = '"+user+"' AND type = '2' AND noteId = '"+comId+"'");
				await query("INSERT INTO activities VALUES('0', '"+user+"', 12, '"+comId+"', '"+date+"')");
				newArray = [comId, postId];
				emitSockets = new Array();
				if(connectedReplyPages.hasKey(comId)){
					for(key in connectedReplyPages[comId]){
						arr = connectedReplyPages[comId][key];
						emitSockets = emitSockets.concat(arr);
					}
				}
				if(connectedCommentPages.hasKey(postId)){
					for(key in connectedCommentPages[postId]){
						arr = connectedCommentPages[postId][key];
						emitSockets = emitSockets.concat(arr);
					}
				}
				if(postObjects.hasKey(postId)){
					arr = postObjects[postId];
					emitSockets = emitSockets.concat(arr);
				}
				emitSockets = emitSockets.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '';
				});
				for(i = 0; i < emitSockets.length; i++){
					emitSocketId = emitSockets[i];
					socket.broadcast.to(emitSocketId).emit('deleteComment', newArray);
				}
			} finally {
				//connect.end();
			}
		})();
	})

	socket.on('deleteReply', function(emitObj){
		user = emitObj.user;
		repId = emitObj.repId;
		comId = emitObj.comId;
		postId = emitObj.postId;
		date = emitObj.date;
		(async () => {
			try {
				await query("DELETE FROM replies WHERE user = '"+user+"' AND id = '"+repId+"' AND comId = '"+comId+"'");
				await query("DELETE FROM replike WHERE repId = '"+repId+"'");
				await query("UPDATE comments SET relevance = relevance - 1 WHERE id = "+comId);
				await query("DELETE FROM `notifications` WHERE userFrom = '"+user+"' AND type = '3' AND noteId = '"+repId+"'");
				await query("INSERT INTO activities VALUES('0', '"+user+"', 13, '"+repId+"', '"+date+"')");
				newArray = [repId, comId];
				emitSockets = new Array();
				if(connectedReplyPages.hasKey(comId)){
					for(key in connectedReplyPages[comId]){
						arr = connectedReplyPages[comId][key];
						emitSockets = emitSockets.concat(arr);
					}
				}
				if(connectedCommentPages.hasKey(postId)){
					for(key in connectedCommentPages[postId]){
						arr = connectedCommentPages[postId][key];
						emitSockets = emitSockets.concat(arr);
					}
				}
				if(postObjects.hasKey(postId)){
					arr = postObjects[postId];
					emitSockets = emitSockets.concat(arr);
				}
				emitSockets = emitSockets.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '';
				});
				for(i = 0; i < emitSockets.length; i++){
					emitSocketId = emitSockets[i];
					socket.broadcast.to(emitSocketId).emit('deleteReply', newArray);
				}
			} finally {
				//connect.end();
			}
		})();
	})

	socket.on('hidePost', function(emitObj){
		user = emitObj.user;
		postId = emitObj.postId;
		date = emitObj.date;
		connect.query("INSERT INTO hiddenposts VALUES('0', '"+user+"', '"+postId+"')");
		connect.query("INSERT INTO activities VALUES('0', '"+user+"', 16, '"+postId+"', '"+date+"')");
		if(loggedInUsers.hasKey(user)){
			emitSockets = loggedInUsers[user];
			emitSockets = emitSockets.filter(function(elem, index, selv){
				return index === selv.indexOf(elem) && elem != '';
			});
			for(i = 0; i < emitSockets.length; i++){
				emitSocketId = emitSockets[i];
				socket.broadcast.to(emitSocketId).emit('hidePost', [postId, user]);
			}
		}
	})

	socket.on('unhidePost', function(emitObj){
		user = emitObj.user;
		postId = emitObj.postId;
		date = emitObj.date;
		connect.query("DELETE FROM hiddenposts WHERE user = '"+user+"' AND postId = '"+postId+"'");
		connect.query("INSERT INTO activities VALUES('0', '"+user+"', 17, '"+postId+"', '"+date+"')");
	})

	socket.on('deletePostP', function(emitObj){
		user = emitObj.user;
		postId = emitObj.postId;
		date = emitObj.date;
		connect.query("DELETE FROM posts WHERE id = '"+postId+"'");
		connect.query("INSERT INTO activities VALUES('0', '"+user+"', 42, '"+postId+"', '"+date+"')");
	})

	socket.on('hideComment', function(emitObj){
		user = emitObj.user;
		postId = emitObj.postId;
		comId = emitObj.comId;
		date = emitObj.date;
		connect.query("UPDATE comments SET hide = concat(hide, ',', '"+user+"') WHERE id = '"+comId+"'");
		connect.query("INSERT INTO activities VALUES('0', '"+user+"', 20, '"+comId+"', '"+date+"')");
		emitSockets = new Array();
		if(connectedReplyPages.hasKey(comId)){
			if(connectedReplyPages[comId].hasKey(user)){
				arr = connectedReplyPages[comId][user];
				emitSockets = emitSockets.concat(arr);
			}
		}
		if(connectedCommentPages.hasKey(postId)){
			if(connectedCommentPages[postId].hasKey(user)){
				arr = connectedCommentPages[postId][user];
				emitSockets = emitSockets.concat(arr);
			}
		}
		if(postObjects.hasKey(postId)){
			arr = postObjects[postId];
			emitSockets = emitSockets.concat(arr);
		}
		emitSockets = emitSockets.filter(function(elem, index, selv){
			return index === selv.indexOf(elem) && elem != '';
		});
		for(i = 0; i < emitSockets.length; i++){
			emitSocketId = emitSockets[i];
			socket.broadcast.to(emitSocketId).emit('hideComment', [comId, user]);
		}
	})

	socket.on('hideReply', function(emitObj){
		user = emitObj.user;
		repId = emitObj.repId;
		comId = emitObj.comId;
		date = emitObj.date;
		connect.query("UPDATE replies SET hide = concat(hide, ',', '"+user+"') WHERE id='"+repId+"'");
		connect.query("INSERT INTO activities VALUES('0', '"+user+"', 22, '"+repId+"', '"+date+"')");
		if(connectedReplyPages.hasKey(comId)){
			if(connectedReplyPages[comId].hasKey(user)){
				emitSockets = connectedReplyPages[comId][user];
				emitSockets = emitSockets.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '';
				});
				for(i = 0; i < emitSockets.length; i++){
					emitSocketId = emitSockets[i];
					socket.broadcast.to(emitSocketId).emit('hideReply', [repId, user]);
				}
			}
		}
	})

	socket.on('unhideComment', function(emitObj){
		user = emitObj.user;
		comId = emitObj.comId;
		date = emitObj.date;
		(async () => {
			try {
				myQuery = await query("SELECT hide FROM comments WHERE id = "+comId);
				hideVal = myQuery[0].hide;
				hideArr = hideVal.split(',');
				if(inArray(user, hideArr)){
					newArr = removeFromArray(user, hideArr);
					hide = newArr.join(',');
					await query("UPDATE comments SET hide = '"+hide+"' WHERE id = '"+comId+"'");
					await query("INSERT INTO activities VALUES('0', '"+user+"', 21, '"+comId+"', '"+date+"')");
				}
			} finally {
				//connect.end();
			}
		})();
	})

	socket.on('unhideReply', function(emitObj){
		user = emitObj.user;
		repId = emitObj.repId;
		date = emitObj.date;
		(async () => {
			try {
				myQuery = await query("SELECT hide FROM replies WHERE id = "+repId);
				hideVal = myQuery[0].hide;
				hideArr = hideVal.split(',');
				if(inArray(user, hideArr)){
					newArr = removeFromArray(user, hideArr);
					hide = newArr.join(',');
					await query("UPDATE replies SET hide = '"+hide+"' WHERE id = '"+repId+"'");
					await query("INSERT INTO activities VALUES('0', '"+user+"', 23, '"+repId+"', '"+date+"')");
				}
			} finally {
				//connect.end();
			}
		})();
	})

	socket.on('deletePost', function(emitObj){
		user = emitObj.user;
		postId = emitObj.postId;
		date = emitObj.date;
		connect.query("UPDATE posts SET deleted = 'true' WHERE id='"+postId+"'");
		connect.query("INSERT INTO activities VALUES('0', '"+user+"', 18, '"+postId+"', '"+date+"')");
		if(postObjects.hasKey(postId)){
			emitSockets = postObjects[postId];
			emitSockets = emitSockets.filter(function(elem, index, selv){
				return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
			});
			for(i = 0; i < emitSockets.length; i++){
				emitSocketId = emitSockets[i];
				socket.broadcast.to(emitSocketId).emit('deletePost', [postId, user]);
			}
		}
	})

	socket.on('undeletePost', function(emitObj){
		user = emitObj.user;
		postId = emitObj.postId;
		date = emitObj.date;
		connect.query("UPDATE posts SET deleted = 'false' WHERE id='"+postId+"'");
		connect.query("INSERT INTO activities VALUES('0', '"+user+"', 19, '"+postId+"', '"+date+"')");
	})

	socket.on('report', function(emitObj){
		user = emitObj.user;
		dataId = emitObj.dataId;
		type = emitObj.type;
		reportIndex = emitObj.reportIndex;
		date = emitObj.date;
		(async () => {
			try {
				myQuery = await query("INSERT INTO reports VALUES('0', '"+user+"', '"+dataId+"', '"+type+"', '"+reportIndex+"', 'false', '"+date+"')");
				reportId = myQuery.insertId;
				await query("INSERT INTO activities VALUES('0', '"+user+"', 43, '"+reportId+"', '"+date+"')");
			} finally {
				//connect.end();
			}
		})();
	})

	socket.on('notifyStatus', function(emitObj){
		user = emitObj.user;
		postId = emitObj.postId;
		val = emitObj.val;
		if(val){
			connect.query("DELETE FROM notifystatus WHERE user = '"+user+"' AND postId = '"+postId+"'");
		} else {
			connect.query("INSERT INTO notifystatus VALUES('0', '"+user+"', '"+postId+"')");
		}
	})

	socket.on('followPage', function(emitObj){
		user = emitObj.user;
		pageId = emitObj.pageId;
		date = emitObj.date;
		val = emitObj.val;
		(async () => {
			try {
				dataQuery = await query("SELECT * FROM `accounts` WHERE id = " + user);
				data = dataQuery[0];
				fName = data.fName;
				lName = data.lName;
				photo = data.photo;
				name = '<b>' + fName + ' ' + lName + '</b>';
				pageQuery = await query("SELECT * FROM `pages` WHERE id = " + pageId);
				pageData = pageQuery[0];
				pageUser = pageData.user;
				pageName = '<b>'+pageData.name+'</b>';
				if(val){
					await query("DELETE FROM pagefollow WHERE user = '"+user+"' AND pageId = '"+pageId+"'");
					await query("DELETE FROM `notifications` WHERE userFrom = '"+user+"' AND userTo = '"+pageUser+"' AND type = '4' AND action = '1' AND dataId = '"+pageId+"'' AND noteId = '0'");
					await query("INSERT INTO activities VALUES('0', '"+user+"', 25, '"+pageId+"', '"+date+"')");
				} else {
					await query("INSERT INTO pagefollow VALUES('0', '"+user+"', '"+pageId+"', '"+date+"')");
					await query("INSERT INTO activities VALUES('0', '"+user+"', 24, '"+pageId+"', '"+date+"')");
					note = name + ' started following ' + pageName;
					insertNote = await query("INSERT INTO `notifications` VALUES('0', '"+user+"', '"+pageUser+"', 4, 1, '"+pageId+"', 0, 'false', 'false', '"+date+"')");
					id = insertNote.insertId;
					if(loggedInUsers.hasKey(pageUser)){
						emitData = {
							isRequest : false,
							id : id,
							type : 4,
							action : 1,
							dataId : pageId,
							noteId : 0,
							extraId : 0,
							paramId : 0,
							note : note,
							photo : photo,
							userFrom : user,
							seen : false,
							date : "Just Now"
						};
						userSockets = loggedInUsers[pageUser];
						userSockets = userSockets.filter(function(elem, index, selv){
							return index === selv.indexOf(elem) && elem != '';
						});
						for(b = 0; b < userSockets.length; b++){
							userSocketId = userSockets[b];
							socket.broadcast.to(userSocketId).emit('notify', emitData);
						}
					}
				}
				emitSockets = new Array();
				if(connectedPagePages.hasKey(user)){
					if(connectedPagePages[user].hasKey(pageId))
						emitSockets = emitSockets.concat(connectedPagePages[user][pageId]);
				}
				emitSockets = emitSockets.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
				});
				for(i = 0; i < emitSockets.length; i++){
					emitSocketId = emitSockets[i];
					socket.broadcast.to(emitSocketId).emit('followPage', emitObj);
				}
			} finally {
				//connect.end();
			}
		})();
	})

	socket.on('follow', function(emitObj){
		myId = emitObj.myId;
		user = emitObj.user;
		date = emitObj.date;
		val = emitObj.val;
		tag = emitObj.tag;
		newTag = emitObj.newTag;
		(async () => {
			try {
				dataQuery = await query("SELECT * FROM `accounts` WHERE id = " + myId);
				data = dataQuery[0];
				fName = data.fName;
				lName = data.lName;
				photo = data.photo;
				if(val){
					await query("DELETE FROM follow WHERE userTo = '"+user+"' AND userFrom = '"+myId+"'");
					await query("DELETE FROM `notifications` WHERE userFrom = '"+myId+"' AND userTo = '"+user+"' AND type = '4' AND action = '0' AND dataId = '0' AND noteId = '0'");
					await query("INSERT INTO activities VALUES('0', '"+myId+"', 27, '"+user+"', '"+date+"')");
				} else {
					access = true;
					queryData = await query("SELECT * FROM settings WHERE user = '"+user+"' AND type = 'req'");
					if(queryData.length == 1){
						opt = parseInt(queryData[0].opt);
						if(opt == 1)
							access = false;
					}
					note = ' requested to follow you';
					accpt = 'no';
					popped = 0;
					e = 28;
					if(access){
						note = ' started following you';
						accpt = 'yes';
						popped = 1;
						e = 26;
					}
					await query("INSERT INTO follow VALUES('0', '"+myId+"', '"+user+"', '"+accpt+"', '"+popped+"', '"+date+"')");
					id = 0;
					if(access){
						insertNote = await query("INSERT INTO `notifications` VALUES('0', '"+myId+"', '"+user+"', 4, 0, 0, 0, 'false', 'false', '"+date+"')");
						id = insertNote.insertId;
					}
					await query("INSERT INTO activities VALUES('0', '"+myId+"', '"+e+"', '"+user+"', '"+date+"')");
					name = '<b>' + fName + ' ' + lName + '</b>';
					note = name + note;
					if(loggedInUsers.hasKey(user)){
						emitData = {
							isRequest : !access,
							id : id,
							type : 4,
							action : 0,
							dataId : myId,
							noteId : 0,
							extraId : 0,
							paramId : 0,
							tab : 'follow',
							date : 'Just Now',
							isFriendReq : false,
							userFrom : myId,
							note : note,
							photo : photo,
							userFrom : myId,
							seen : false,
							date : "Just Now"
						};
						userSockets = loggedInUsers[user];
						userSockets = userSockets.filter(function(elem, index, selv){
							return index === selv.indexOf(elem) && elem != '';
						});
						for(b = 0; b < userSockets.length; b++){
							userSocketId = userSockets[b];
							socket.broadcast.to(userSocketId).emit('notify', emitData);
						}
					}
				}
				emitSockets = new Array();
				if(connectedProfilePages.hasKey(myId)){
					if(connectedProfilePages[myId].hasKey(user))
						emitSockets = emitSockets.concat(connectedProfilePages[myId][user]);
				}
				emitSockets = emitSockets.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
				});
				for(i = 0; i < emitSockets.length; i++){
					emitSocketId = emitSockets[i];
					socket.broadcast.to(emitSocketId).emit('follow', emitObj);
				}
			} finally {
				//connect.end();
			}
		})();
	})

	socket.on('friend', function(emitObj){
		myId = emitObj.myId;
		user = emitObj.user;
		date = emitObj.date;
		tag = emitObj.tag;
		newTag = emitObj.newTag;
		rejected = emitObj.val;
		(async () => {
			try {
				dataQuery = await query("SELECT * FROM `accounts` WHERE id = " + myId);
				data = dataQuery[0];
				fName = data.fName;
				lName = data.lName;
				photo = data.photo;
				myUserName = data.userName;
				name = '<b>' + fName + ' ' + lName + '</b>';
				id = 0;
				isRequest = true;
				isAccepting = false;
				a = ['', 35, 34, 32];
				if(tag == 2)
					isAccepting = true;
				if(tag == 1 || tag == 3 || (tag == 2 && rejected)){
					e = a[tag];
					await query("DELETE FROM friends WHERE (userTo = '"+user+"' AND userFrom = '"+myId+"') OR (userTo = '"+myId+"' AND userFrom = '"+user+"')");
					await query("INSERT INTO activities VALUES('0', '"+myId+"', '"+e+"', '"+user+"', '"+date+"')");
					if(tag == 3){
						if(loggedInUsers.hasKey(myId)){
							myQuery = "SELECT * FROM accounts WHERE id = '"+user+"'";
							myData = await query(myQuery);
							userName = myData[0].userName;
							if(inArray(user, friendsArray[socket.id]))
								removeFromArray(user, friendsArray[socket.id]);
							mySockets = loggedInUsers[myId];
							mySockets = mySockets.filter(function(elem, index, selv){
								return index === selv.indexOf(elem) && elem != '';
							});
							for(i = 0; i < mySockets.length; i++){
								mySocketId = mySockets[i];
								socket.broadcast.to(mySocketId).emit('inactive', userName);
								if(mySocketId != socket.id)
									socket.broadcast.to(mySocketId).emit('removeFriend', user);
							}
						}
						if(loggedInUsers.hasKey(user)){
							mySocketsA = loggedInUsers[user];
							mySocketsA = mySocketsA.filter(function(elem, index, selv){
								return index === selv.indexOf(elem) && elem != '';
							});
							for(i = 0; i < mySocketsA.length; i++){
								mySocketIdA = mySocketsA[i];
								socket.broadcast.to(mySocketIdA).emit('inactive', myUserName);
								socket.broadcast.to(mySocketIdA).emit('removeFriend', myId);
							}
						}
					}
				} else {
					if(tag == 2 && !rejected){
						isRequest = false;
						await query("UPDATE friends SET accepted = 'yes' WHERE userTo = '"+myId+"' AND userFrom = '"+user+"'");
						note = name + ' accepted your friend request';
						insertNote = await query("INSERT INTO `notifications` VALUES('0', '"+myId+"', '"+user+"', 5, 0, 0, 0, 'false', 'false', '"+date+"')");
						await query("INSERT INTO activities VALUES('0', '"+myId+"', 33, '"+user+"', '"+date+"')");
						id = insertNote.insertId;
					} else {
						note = name + ' sent you a friend request';
						await query("INSERT INTO friends VALUES('0', '"+myId+"', '"+user+"', 'no', 1, '"+date+"')");
						await query("INSERT INTO activities VALUES('0', '"+myId+"', 31, '"+user+"', '"+date+"')");
					}
					if(loggedInUsers.hasKey(user)){
						emitData = {
							isRequest : isRequest,
							id : id,
							type : 5,
							action : 0,
							dataId : myId,
							noteId : 0,
							extraId : 0,
							paramId : 0,
							tab : 'friend',
							date : 'Just Now',
							isFriendReq : true,
							userFrom : myId,
							photo : photo,
							note : note,
							seen : false,
							date : "Just Now"
						};
						myQuery = "SELECT * FROM accounts WHERE id = '"+myId+"'";
						myData = await query(myQuery);
						userName = myData[0].userName;
						photo = myData[0].photo;
						fName = myData[0].fName;
						lName = myData[0].lName;
						userDataArray = [myId, userName, photo, fName, lName];
						if(!inArray(user, friendsArray[socket.id]))
							friendsArray[socket.id].push(user);
						userSockets = loggedInUsers[user];
						userSockets = userSockets.filter(function(elem, index, selv){
							return index === selv.indexOf(elem) && elem != '';
						});
						for(b = 0; b < userSockets.length; b++){
							userSocketId = userSockets[b];
							socket.broadcast.to(userSocketId).emit('notify', emitData);
							socket.broadcast.to(userSocketId).emit('active', userDataArray);
							socket.broadcast.to(userSocketId).emit('addToFriend', myId);
						}
					}
					if(loggedInUsers.hasKey(myId)){
						myQueryA = "SELECT * FROM accounts WHERE id = '"+user+"'";
						myDataA = await query(myQueryA);
						userNameA = myDataA[0].userName;
						photoA = myDataA[0].photo;
						fNameA = myDataA[0].fName;
						lNameA = myDataA[0].lName;
						userDataArrayA = [user, userNameA, photoA, fNameA, lNameA];
						mySockets = loggedInUsers[myId];
						mySockets = mySockets.filter(function(elem, index, selv){
							return index === selv.indexOf(elem) && elem != '';
						});
						for(r = 0; r < mySockets.length; r++){
							mySocketId = mySockets[r];
							socket.broadcast.to(mySocketId).emit('active', userDataArrayA);
							if(mySocketId != socket.id)
								socket.broadcast.to(mySocketId).emit('addToFriend', user);
						}
					}
				}
				emitSockets = new Array();
				if(connectedProfilePages.hasKey(user)){
					if(connectedProfilePages[user].hasKey(myId))
						emitSockets = emitSockets.concat(connectedProfilePages[user][myId]);
				}
				if(connectedProfilePages.hasKey(myId)){
					if(connectedProfilePages[myId].hasKey(user))
						emitSockets = emitSockets.concat(connectedProfilePages[myId][user]);
				}
				if(loggedInUsers.hasKey(myId) && isAccepting)
					emitSockets = emitSockets.concat(loggedInUsers[myId]);
				emitSockets = emitSockets.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
				});
				for(i = 0; i < emitSockets.length; i++){
					emitSocketId = emitSockets[i];
					socket.broadcast.to(emitSocketId).emit('friend', emitObj);
				}
			} finally {
				//connect.end();
			}
		})();
	})

	socket.on('acceptFollow', function(emitObj){
		myId = emitObj.myId;
		user = emitObj.user;
		date = emitObj.date;
		accepted = emitObj.val;
		(async () => {
			try {
				dataQuery = await query("SELECT * FROM `accounts` WHERE id = " + myId);
				data = dataQuery[0];
				fName = data.fName;
				lName = data.lName;
				gender = data.gender;
				photo = data.photo;
				pre = 'him';
				if(gender == 'Female')
					pre = 'her';
				name = '<b>' + fName + ' ' + lName + '</b>';
				if(!accepted){
					await query("DELETE FROM follow WHERE userTo = '"+myId+"' AND userFrom = '"+user+"'");
					await query("INSERT INTO activities VALUES('0', '"+myId+"', 30, '"+user+"', '"+date+"')");
				} else {
					await query("UPDATE follow SET accepted = 'yes' WHERE userTo = '"+myId+"' AND userFrom = '"+user+"'");
					await query("INSERT INTO activities VALUES('0', '"+myId+"', 29, '"+user+"', '"+date+"')");
					note = name + ' has permitted you to follow ' + pre;
					insertNote = await query("INSERT INTO `notifications` VALUES('0', '"+myId+"', '"+user+"', 4, 2, 0, 0, 'false', 'false', '"+date+"')");
					id = insertNote.insertId;
					if(loggedInUsers.hasKey(user)){
						emitData = {
							isRequest : false,
							id : id,
							type : 4,
							action : 2,
							dataId : myId,
							noteId : 0,
							extraId : 0,
							paramId : 0,
							note : note,
							photo : photo,
							userFrom : myId,
							seen : false,
							date : "Just Now"
						};
						userSockets = loggedInUsers[user];
						userSockets = userSockets.filter(function(elem, index, selv){
							return index === selv.indexOf(elem) && elem != '';
						});
						for(b = 0; b < userSockets.length; b++){
							userSocketId = userSockets[b];
							socket.broadcast.to(userSocketId).emit('notify', emitData);
						}
					}
				}
				emitSockets = new Array();
				if(connectedProfilePages.hasKey(user)){
					if(connectedProfilePages[user].hasKey(myId))
						emitSockets = emitSockets.concat(connectedProfilePages[user][myId]);
				}
				if(loggedInUsers.hasKey(myId))
					emitSockets = emitSockets.concat(loggedInUsers[myId]);
				emitSockets = emitSockets.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
				});
				for(i = 0; i < emitSockets.length; i++){
					emitSocketId = emitSockets[i];
					socket.broadcast.to(emitSocketId).emit('acceptFollow', emitObj);
				}
			} finally {
				//connect.end();
			}
		})();
	})

	socket.on('seenNote', function(id){
		connect.query("UPDATE `notifications` SET seen = 'true' WHERE id = " + id);
	})

	socket.on('reportProblem', function(emitObj){
		user = emitObj.user;
		page = emitObj.page;
		report = emitObj.report;
		date = emitObj.date;
		report = report.replace(/[']/g, "\\'");
		connect.query("INSERT INTO reportprob VALUES('0', '"+user+"', '"+page+"', '"+report+"', '"+date+"')");
	})

	socket.on('sound', function(emitObj){
		userFrom = emitObj.userFrom;
		userTo = emitObj.userTo;
		value = emitObj.value;
		msgId = emitObj.msgId;
		if(value)
			connect.query("INSERT INTO offchatsound VALUES('0', '"+userFrom+"', '"+userTo+"')");
		else
			connect.query("DELETE FROM offchatsound WHERE userTo = '"+userTo+"' AND userFrom = '"+userFrom+"'");
		array = [userTo, value, msgId];
		emitSockets = new Array();
		if(connectedMessagePages.hasKey(userFrom)){
			if(connectedMessagePages[userFrom].hasKey(userTo))
				emitSockets = emitSockets.concat(connectedMessagePages[userFrom][userTo]);
		}
		if(connectedInboxPages.hasKey(userFrom))
			emitSockets = emitSockets.concat(connectedInboxPages[userFrom]);
		emitSockets = emitSockets.filter(function(elem, index, selv){
			return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
		});
		for(i = 0; i < emitSockets.length; i++){
			emitSocketId = emitSockets[i];
			socket.broadcast.to(emitSocketId).emit('sound', array);
		}
	})

	socket.on('online', function(emitObj){
		userFrom = emitObj.userFrom;
		userTo = emitObj.userTo;
		value = emitObj.value;
		msgId = emitObj.msgId;
		if(!value)
			connect.query("INSERT INTO offlinechat VALUES('0', '"+userFrom+"', '"+userTo+"')");
		else
			connect.query("DELETE FROM offlinechat WHERE userTo = '"+userTo+"' AND userFrom = '"+userFrom+"'");
		array = [userTo, value, msgId];
		emitSockets = new Array();
		if(connectedMessagePages.hasKey(userFrom)){
			if(connectedMessagePages[userFrom].hasKey(userTo))
				emitSockets = emitSockets.concat(connectedMessagePages[userFrom][userTo]);
		}
		if(connectedMessagePages.hasKey(userTo)){
			if(connectedMessagePages[userTo].hasKey(userFrom))
				emitSockets = emitSockets.concat(connectedMessagePages[userTo][userFrom]);
		}
		if(connectedInboxPages.hasKey(userFrom))
			emitSockets = emitSockets.concat(connectedInboxPages[userFrom]);
		if(connectedInboxPages.hasKey(userTo))
			emitSockets = emitSockets.concat(connectedInboxPages[userTo]);
		emitSockets = emitSockets.filter(function(elem, index, selv){
			return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
		});
		for(i = 0; i < emitSockets.length; i++){
			emitSocketId = emitSockets[i];
			socket.broadcast.to(emitSocketId).emit('online', array);
		}
	})

	socket.on('favourite', function(emitObj){
		userFrom = emitObj.userFrom;
		userTo = emitObj.userTo;
		msgId = emitObj.msgId;
		value = emitObj.value;
		if(!value)
			connect.query("INSERT INTO favourites VALUES('0', '"+userFrom+"', '"+msgId+"')");
		else
			connect.query("DELETE FROM favourites WHERE user = '"+userFrom+"' AND msgId = '"+msgId+"'");
		array = [msgId, value];
		emitSockets = new Array();
		if(connectedMessagePages.hasKey(userFrom)){
			if(connectedMessagePages[userFrom].hasKey(userTo))
				emitSockets = emitSockets.concat(connectedMessagePages[userFrom][userTo]);
		}
		if(connectedInboxPages.hasKey(userFrom))
			emitSockets = emitSockets.concat(connectedInboxPages[userFrom]);
		emitSockets = emitSockets.filter(function(elem, index, selv){
			return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
		});
		for(i = 0; i < emitSockets.length; i++){
			emitSocketId = emitSockets[i];
			socket.broadcast.to(emitSocketId).emit('favourite', array);
		}
	})

	socket.on('archive', function(emitObj){
		userFrom = emitObj.userFrom;
		userTo = emitObj.userTo;
		msgId = emitObj.msgId;
		value = emitObj.value;
		if(!value)
			connect.query("INSERT INTO archives VALUES('0', '"+userFrom+"', '"+msgId+"')");
		else
			connect.query("DELETE FROM archives WHERE user = '"+userFrom+"' AND msgId = '"+msgId+"'");
		array = [msgId, value];
		emitSockets = new Array();
		if(connectedMessagePages.hasKey(userFrom)){
			if(connectedMessagePages[userFrom].hasKey(userTo))
				emitSockets = emitSockets.concat(connectedMessagePages[userFrom][userTo]);
		}
		if(connectedInboxPages.hasKey(userFrom))
			emitSockets = emitSockets.concat(connectedInboxPages[userFrom]);
		emitSockets = emitSockets.filter(function(elem, index, selv){
			return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
		});
		for(i = 0; i < emitSockets.length; i++){
			emitSocketId = emitSockets[i];
			socket.broadcast.to(emitSocketId).emit('archive', array);
		}
	})

	socket.on('blockChat', function(emitObj){
		userFrom = emitObj.userFrom;
		userTo = emitObj.userTo;
		msgId = emitObj.msgId;
		value = emitObj.value;
		name = emitObj.name;
		date = emitObj.date;
		if(!value){
			connect.query("INSERT INTO msgblock VALUES('0', '"+userFrom+"', '"+userTo+"')");
			connect.query("INSERT INTO activities VALUES('0', '"+userFrom+"', 44, '"+userTo+"', '"+date+"')");
		} else {
			connect.query("DELETE FROM msgblock WHERE userFrom = '"+userFrom+"' AND userTo = '"+userTo+"'");
			connect.query("INSERT INTO activities VALUES('0', '"+userFrom+"', 45, '"+userTo+"', '"+date+"')");
		}
		socket.emit('blockMsg', [user, !value, name, msgId]);
		array = [userTo, msgId, value, !value];
		emitSockets = new Array();
		if(connectedMessagePages.hasKey(userFrom)){
			if(connectedMessagePages[userFrom].hasKey(userTo))
				emitSockets = emitSockets.concat(connectedMessagePages[userFrom][userTo]);
		}
		if(connectedMessagePages.hasKey(userTo)){
			if(connectedMessagePages[userTo].hasKey(userFrom))
				emitSockets = emitSockets.concat(connectedMessagePages[userTo][userFrom]);
		}
		if(connectedInboxPages.hasKey(userFrom))
			emitSockets = emitSockets.concat(connectedInboxPages[userFrom]);
		if(connectedInboxPages.hasKey(userTo))
			emitSockets = emitSockets.concat(connectedInboxPages[userTo]);
		emitSockets = emitSockets.filter(function(elem, index, selv){
			return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
		});
		for(i = 0; i < emitSockets.length; i++){
			emitSocketId = emitSockets[i];
			socket.broadcast.to(emitSocketId).emit('blockChat', array);
		}
	})

	socket.on('deleteChat', function(emitObj){
		userFrom = emitObj.userFrom;
		userTo = emitObj.userTo;
		msgId = emitObj.msgId;
		date = emitObj.date;
		(async () => {
			try {
				await query("DELETE FROM allmsgs WHERE deleted != '"+userFrom+"' AND deleted != '0' AND msgId = '"+msgId+"'");
				await query("UPDATE allmsgs SET deleted = '"+userFrom+"' WHERE msgId = '"+msgId+"'");
				await query("UPDATE startmsg SET deleted = '"+userFrom+"' WHERE id = '"+msgId+"'");
				await query("DELETE FROM startmsg WHERE deleted != '"+userFrom+"' AND deleted != '0' AND id = '"+msgId+"'");
				await query("INSERT INTO activities VALUES('0', '"+userFrom+"', 46, '"+userTo+"', '"+date+"')");
				emitSockets = new Array();
				if(connectedMessagePages.hasKey(userFrom)){
					if(connectedMessagePages[userFrom].hasKey(userTo))
						emitSockets = emitSockets.concat(connectedMessagePages[userFrom][userTo]);
				}
				if(connectedInboxPages.hasKey(userFrom))
					emitSockets.concat(connectedInboxPages[userFrom]);
				emitSockets = emitSockets.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
				});
				for(i = 0; i < emitSockets.length; i++){
					emitSocketId = emitSockets[i];
					socket.broadcast.to(emitSocketId).emit('deleteChat', msgId);
				}
			} finally {
				//connect.end();
			}
		})();
	})

	socket.on('saveSearchHistory', function(emitObj){
		user = emitObj.user;
		dataId = emitObj.dataId;
		category = emitObj.category;
		type = emitObj.type;
		txt = emitObj.txt;
		count = emitObj.count;
		(async () => {
			try {
				await query("DELETE FROM search WHERE user = '"+user+"' AND category = '"+category+"' AND type = '"+type+"' AND dataId = '"+dataId+"' AND text = '"+txt+"'");
				await query("INSERT INTO search VALUES (0, '"+user+"', '"+category+"', '"+type+"', '"+dataId+"', '"+txt+"')");
				querySearchCnt = "SELECT count(*) AS count FROM search WHERE user = '"+user+"' AND category = '"+category+"'";
				searchCntAwait = await query(querySearchCnt);
				searchCnt = searchCntAwait[0].count;
				if(searchCnt > count)
					query("DELETE FROM search WHERE user = '"+user+"' AND category = '"+category+"' AND type = '"+type+"' ORDER BY id ASC LIMIT 1");
			} finally {
				//connect.end();
			}
		})();
	})

	socket.on('checkMention', function(emitObj){
		lastWord = emitObj.lastWord;
		advanced = emitObj.advanced;
		user = emitObj.user;
		limit = 30;
		frndsArr = new Array();
		pagesArr = new Array();
		userAdvArr = new Array();
		pagesAdvArr = new Array();
		dataArr = new Array();
		if(lastWord.startsWith('@'))
			lastWord = lastWord.substring(1);
		lastWord = lastWord.replace(/[']/g, "\\'");
		tType = null;
		tUser = 0;
		(async () => {
			try {
				blockArray = await getBlockedArray(user);
				if(advanced){
					table = emitObj.table;
					dataId = emitObj.dataId;
					if(table == 'replies'){
						column = 'comId';
						cQuery = await query("SELECT * FROM comments WHERE user = '"+dataId+"'");
						if(cQuery.length > 0){
							tUser = cQuery[0].user;
							tType = cQuery[0].type;
							if(tType == 'page')
								pagesAdvArr.push(tUser);
							else {
								blocked = await isBlocked(user, tUser);
								if(!blocked)
									userAdvArr.push(tUser);
							}

						}
					} else {
						column = 'postId';
						cQuery = await query("SELECT * FROM posts WHERE id = '"+dataId+"'");
						if(cQuery.length > 0){
							tUser = cQuery[0].user;
							tType = cQuery[0].postType;
							if(tType == 'page')
								pagesAdvArr.push(tUser);
							else {
								blocked = await isBlocked(user, tUser);
								if(!blocked)
									userAdvArr.push(tUser);
							}
						}
					}
					if(pagesAdvArr.length == 1){
						pQuery = await query("SELECT id AS id, name AS fName, '' AS lName, photo AS photo, verified AS verified, 'Page' AS tab FROM pages WHERE id = '"+tUser+"' AND (name LIKE '"+lastWord+"%' OR name LIKE '% "+lastWord+"%')");
						if(pQuery.length == 1){
							pData = pQuery[0];
							pData['commented'] = true;
							pData['tUser'] = true;
							dataArr.push(pData);
						}
					} else if(userAdvArr.length == 1){
						pQuery = await query("SELECT id AS id, fName AS fName, lName AS lName, photo AS photo, verified AS verified, 'Friend' AS tab FROM accounts WHERE id = '"+tUser+"' AND (fName LIKE '"+lastWord+"%' OR fName LIKE '% "+lastWord+"%' OR lName LIKE '"+lastWord+"%' OR lName LIKE '% "+lastWord+"%')");
						if(pQuery.length == 1){
							pData = pQuery[0];
							pData['commented'] = true;
							pData['tUser'] = true;
							dataArr.push(pData);
						}
					}
					userAdvArr = new Array();
					pagesAdvArr = new Array();
					advQueryStr = "SELECT * FROM "+table+" WHERE "+column+" = '"+dataId+"'";
					advQuery = await query(advQueryStr);
					for(a = 0; a < advQuery.length; a++){
						dataUser = advQuery[a].user;
						dataType = advQuery[a].type;
						if(dataType == 'page' && (!(tType  == 'page') || (tType  == 'page' && !(dataUser == tUser))))
							pagesAdvArr.push(dataUser);
						else if(dataType == 'profile' && (!(tType  == 'profile') || (tType  == 'profile' && !(dataUser == tUser)))){
							if(!inArray(dataUser, blockArray))
								userAdvArr.push(dataUser);
						}
					}
					userAdvArr = userAdvArr.filter(function(elem, index, selv){
						return index === selv.indexOf(elem) && elem != '';
					});
					pagesAdvArr = pagesAdvArr.filter(function(elem, index, selv){
						return index === selv.indexOf(elem) && elem != '';
					});
					if((userAdvArr.length + pagesAdvArr.length) > 0){
						limit -= dataArr.length;
						searchQueryStr = '';
						if(userAdvArr.length > 0){
							advUsers = userAdvArr.join(',');
							searchQueryStr += "SELECT id AS id, fName AS fName, lName AS lName, photo AS photo, verified AS verified, 'Friend' AS tab FROM accounts WHERE id IN ("+advUsers+") AND (fName LIKE '"+lastWord+"%' OR fName LIKE '% "+lastWord+"%' OR lName LIKE '"+lastWord+"%' OR lName LIKE '% "+lastWord+"%')";							
						}
						if(userAdvArr.length > 0 && pagesAdvArr.length > 0)
							searchQueryStr += " UNION ";
						if(pagesAdvArr.length > 0){
							advPages = pagesAdvArr.join(',');
							searchQueryStr += "SELECT id AS id, name AS fName, '' AS lName, photo AS photo, verified AS verified, 'Page' AS tab FROM pages WHERE id IN ("+advPages+") AND (name LIKE '"+lastWord+"%' OR name LIKE '% "+lastWord+"%')";
						}
						searchQueryStr += "ORDER BY fName, lName LIMIT "+limit;
						searchQuery = await query(searchQueryStr);
						for(b = 0; b < searchQuery.length; b++){
							dataObject = searchQuery[b];
							tab = dataObject.tab;
							id = dataObject.id;
							dataObject['commented'] = true;
							dataObject['tUser'] = false;
							dataArr.push(dataObject);
						}				
					}		
					limit -= dataArr.length;
				}
				if(limit > 0){
					for(i = 0; i < friendsArray[socket.id].length; i++){
						fUser = friendsArray[socket.id][i];
						if(((tType == 'profile' && !(tUser == fUser)) || tType == 'page' || tType == null) && !inArray(fUser, userAdvArr)){
							tagSet = await userPrefSettings(fUser);
							if(tagSet && !inArray(fUser, blockArray))
								frndsArr.push(fUser);
						}
					}
					if(!inArray(user, userAdvArr))
						frndsArr.push(user);
					pagesQueryStr = "SELECT pageId AS pageId FROM pagefollow WHERE user = '"+user+"' UNION SELECT id AS pageId FROM pages WHERE user = '"+user+"'";
					pagesQuery = await query(pagesQueryStr);
					for(x = 0; x < pagesQuery.length; x++){
						pageId = pagesQuery[x].pageId;
						if(tType == 'page' && (!(tUser == pageId) && !inArray(pageId, pagesAdvArr)))
							pagesArr.push(pageId);
					}
					frndsArr = frndsArr.filter(function(elem, index, selv){
						return index === selv.indexOf(elem) && elem != '';
					});
					pagesArr = pagesArr.filter(function(elem, index, selv){
						return index === selv.indexOf(elem) && elem != '';
					});
					if((frndsArr.length + pagesArr.length) > 0){
						searchQueryStr = "";
						if(frndsArr.length > 0){
							ascFrnds = frndsArr.join(',');
							searchQueryStr += "SELECT id AS id, fName AS fName, lName AS lName, photo AS photo, verified AS verified, 'Friend' AS tab FROM accounts WHERE id IN ("+ascFrnds+") AND (fName LIKE '"+lastWord+"%' OR fName LIKE '% "+lastWord+"%' OR lName LIKE '"+lastWord+"%' OR lName LIKE '% "+lastWord+"%')";
						}
						if(frndsArr.length > 0 && pagesArr.length > 0)
							searchQueryStr += " UNION ";
						if(pagesArr.length > 0){
							followedPages = pagesArr.join(',');
							searchQueryStr += "SELECT id AS id, name AS fName, '' AS lName, photo AS photo, verified AS verified, 'Page' AS tab FROM pages WHERE id IN ("+followedPages+") AND (name LIKE '"+lastWord+"%' OR name LIKE '% "+lastWord+"%') ";
						}
						searchQueryStr += "ORDER BY fName, lName LIMIT "+limit;
						searchQuery = await query(searchQueryStr);
						for(b = 0; b < searchQuery.length; b++){
							dataObject = searchQuery[b];
							tab = dataObject.tab;
							id = dataObject.id;
							dataObject['commented'] = false;
							dataObject['tUser'] = false;
							dataArr.push(dataObject);
						}
					}
				}
				socket.emit('mentionList', dataArr);
			} finally {
				//connect.end();
			}
		})();		
	})

	socket.on('searchUser', function(emitObj){
		searchText = emitObj.searchText;
		searchAll = emitObj.searchAll;
		user = emitObj.user;
		arrayList = new Array();
		object = new Object();
		object['searchAll'] = searchAll;
		searchText = searchText.replace(/[']/g, "\\'");
		(async () => {
			try {
				blockArray = await getBlockedArray(user);
				blockedUsers = blockArray.join(',');
				searchStr = "(userName LIKE '"+searchText+"%' OR  fName LIKE '"+searchText+"%' OR lName LIKE '"+searchText+"%'";
				words = searchText.split(' ');
				for(i = 0; i < words.length; i++){
					word = words[i];
					if(word === "" || word == searchText)
						words.splice(i, 1);
				}
				if(words.length > 0){
					fWord = words[0];
					if(words.length == 1)
						searchStr += " OR fName LIKE '"+fWord+"%' OR lName LIKE '"+fWord+"%'";
					else {
						lastKey = words.length - 1;
						searchStr += " OR (";
						for(key = 0; key < words.length; key++){
							word = words[key];
							if(key > 0){
								searchStr += "(fName LIKE '"+fWord+"%' AND fName LIKE '% "+word+"%') OR (fName LIKE '"+fWord+"%' AND lName LIKE '% "+word+"%') OR ";
								searchStr += "(fName LIKE '"+fWord+"%' AND lName LIKE '"+word+"%'";
								count = 0;
								lastMKey = lastKey - 1;
								for(mKey = 0; mKey < words.length; mKey++){
									mWord = words[mKey];
									if(!(mKey == 0) && !(mKey == key)){
										count++;
										searchStr += " AND (fName LIKE '% "+mWord+"%'";
										lastMmKey = lastMKey - 1;
										if(count < lastMKey){
											mCount = 0;
											searchStr += " AND (";
											for(mMKey = 0; mMKey < words.length; mMKey++){
												mMWord = words[mMKey];
												if(!(mMKey == 0) && !(mMKey == key) && !(mKey == mMKey)){
													searchStr += "fName LIKE '% "+mMWord+"%' OR lName LIKE '% "+mMWord+"%'";
													mCount++;
													if(mCount < lastMmKey)
														searchStr += " OR ";
												}
											}
											searchStr += ")";
										}
										searchStr += " OR lName LIKE '% "+mWord+"%')";
									}
								}
								searchStr += ") OR (lName LIKE '"+fWord+"%' AND fName LIKE '% "+word+"%') OR (lName LIKE '"+fWord+"%' AND lName LIKE '% "+word+"%')";
								searchStr += " OR (lName LIKE '"+fWord+"%' AND fName LIKE '"+word+"%'";
								count = 0;
								lastMKey = lastKey - 1;
								for(mKey = 0; mKey < words.length; mKey++){
									mWord = words[mKey];
									if(!(mKey == 0) && !(mKey == key)){
										count++;
										searchStr += " AND (fName LIKE '% "+mWord+"%'";
										lastMmKey = lastMKey - 1;
										if(count < lastMKey){
											mCount = 0;
											searchStr += " AND (";
											for(mMKey = 0; mMKey < words.length; mMKey++){
												mMWord = words[mMKey];
												if(!(mMKey == 0) && !(mMKey == key) && !(mKey == mMKey)){
													searchStr += "fName LIKE '% "+mMWord+"%' OR lName LIKE '% "+mMWord+"%'";
													mCount++;
													if(mCount < lastMmKey)
														searchStr += " OR ";
												}
											}
											searchStr += ")";
										}
										searchStr += " OR lName LIKE '% "+mWord+"%')";
									}
								}
								searchStr += ")";
								if(key < lastKey)
									searchStr += " OR ";
								else 
									searchStr += ")";
							}
						}
					}
				}
				searchStr += ")";
				if(searchAll)
					myQuery = await query("SELECT * FROM accounts WHERE id NOT IN ("+blockedUsers+") AND " + searchStr + " ORDER BY fName, lName, userName LIMIT 20");
				else {
					queryStr = "SELECT * FROM (SELECT userTo AS user FROM friends WHERE userFrom = '"+user+"' AND accepted = 'yes' UNION ";
					queryStr += "SELECT userFrom AS user FROM friends WHERE userTo = '"+user+"' AND accepted = 'yes') AS t ";
					queryStr += "INNER JOIN accounts ON t.user = id WHERE id NOT IN ("+blockedUsers+") AND " + searchStr + " ORDER BY fName, lName, userName LIMIT 20";
					myQuery = await query(queryStr);
				}
				for(x = 0; x < myQuery.length; x++){
					mySql = myQuery[x];
					data = new Object;
					sUser = mySql.id;
					name = mySql.fName + ' ' + mySql.lName;
					userName = mySql.userName;
					photo = mySql.photo;
					verified = mySql.verified;
					if(!searchAll)
						msgId = await getMessageId(user, sUser);
					else 
						msgId = 0;
					data['msgId'] = msgId;
					data['user'] = sUser;
					data['name'] = name;
					data['userName'] = userName;
					data['photo'] = photo;
					data['verified'] = verified.stringToBoolean();
					arrayList.push(data);
				}
				object['data'] = arrayList;
				socket.emit('searchResult', object);
			} finally {
				//connect.end();
			}
		})();		
	})

	socket.on('addToFriend', function(user){
		if(!inArray(user, friendsArray[socket.id]))
			friendsArray[socket.id].push(user);
	})

	socket.on('removeFriend', function(user){
		if(inArray(user, friendsArray[socket.id]))
			removeFromArray(user, friendsArray[socket.id]);
	})

	socket.on('notifications', function(user){
		connect.query("UPDATE notifications SET popped = 'true' WHERE popped = 'false' AND userTo = "+user);
		connect.query("UPDATE friends SET popped = '1' WHERE popped = '0' AND userTo = "+user);
		connect.query("UPDATE follow SET popped = '1' WHERE popped = '0' AND userTo = "+user);
	})

	socket.on('message', function(user){
		connect.query("UPDATE allmsgs SET popped = '1' WHERE popped = '0' AND userTo = "+user);
	})

	socket.on('blockUser', function(emitObj){
		(async () => {
			try {
				userFrom = emitObj.userFrom;
				userTo = emitObj.userTo;
				name = emitObj.name;
				blocking = emitObj.blocking;
				date = emitObj.date;
				if(blocking){
					blockOpt = emitObj.blockOpt;
					if(blockOpt.unfollow){
						array = [26, 27, 28, 29, 30, 31, 32, 33, 34, 35];
						joinedArr = array.join(',');
						await query("DELETE FROM activities WHERE actId IN ("+joinedArr+") AND user = '"+userFrom+"' AND dataId = '"+userTo+"'");
						await query("DELETE FROM activities WHERE actId IN ("+joinedArr+") AND user = '"+userTo+"' AND dataId = '"+userFrom+"'");
						await query("DELETE FROM follow WHERE (userFrom = '"+userFrom+"' AND userTo = '"+userTo+"') OR (userTo = '"+userFrom+"' AND userFrom = '"+userTo+"')");
						await query("DELETE FROM notifications WHERE type = '4' AND action IN (0, 2) AND ((userFrom = '"+userFrom+"' AND userTo = '"+userTo+"') OR (userTo = '"+userFrom+"' AND userFrom = '"+userTo+"'))");
					}
					if(blockOpt.unfriend){
						array = ['profile', 'message'];
						joinedArr = array.join(',');
						await query("DELETE FROM activities WHERE actId IN (44, 45, 46, 47, 48) AND user = '"+userFrom+"' AND dataId = '"+userTo+"'");
						await query("DELETE FROM activities WHERE actId IN (44, 45, 46, 47, 48) AND user = '"+userTo+"' AND dataId = '"+userFrom+"'");
						await query("DELETE FROM activities WHERE activities.actId = '43' AND activities.user = '"+userFrom+"' AND EXISTS (SELECT 1 FROM reports WHERE reports.type = 'post' AND activities.dataId = reports.id AND EXISTS (SELECT 1 FROM posts WHERE posts.user = '"+userTo+"' AND posts.postType = 'profile' AND reports.dataId = posts.id))");
						await query("DELETE FROM activities WHERE activities.actId = '43' AND activities.user = '"+userTo+"' AND EXISTS (SELECT 1 FROM reports WHERE reports.type = 'post' AND activities.dataId = reports.id AND EXISTS (SELECT 1 FROM posts WHERE posts.user = '"+userFrom+"' AND posts.postType = 'profile' AND reports.dataId = posts.id))");
						await query("DELETE FROM activities WHERE activities.actId = '43' AND activities.user = '"+userFrom+"' AND EXISTS (SELECT 1 FROM reports WHERE reports.type = 'comment' AND activities.dataId = reports.id AND EXISTS (SELECT 1 FROM comments WHERE comments.user = '"+userTo+"' AND comments.type = 'profile' AND reports.dataId = comments.id))");
						await query("DELETE FROM activities WHERE activities.actId = '43' AND activities.user = '"+userTo+"' AND EXISTS (SELECT 1 FROM reports WHERE reports.type = 'comment' AND activities.dataId = reports.id AND EXISTS (SELECT 1 FROM comments WHERE comments.user = '"+userFrom+"' AND comments.type = 'profile' AND reports.dataId = comments.id))");
						await query("DELETE FROM activities WHERE activities.actId = '43' AND activities.user = '"+userFrom+"' AND EXISTS (SELECT 1 FROM reports WHERE reports.type = 'reply' AND activities.dataId = reports.id AND EXISTS (SELECT 1 FROM replies WHERE replies.user = '"+userTo+"' AND replies.type = 'profile' AND reports.dataId = replies.id))");
						await query("DELETE FROM activities WHERE activities.actId = '43' AND activities.user = '"+userTo+"' AND EXISTS (SELECT 1 FROM reports WHERE reports.type = 'reply' AND activities.dataId = reports.id AND EXISTS (SELECT 1 FROM replies WHERE replies.user = '"+userFrom+"' AND replies.type = 'profile' AND reports.dataId = replies.id))");
						await query("DELETE FROM activities WHERE activities.actId = '43' AND activities.user = '"+userFrom+"' AND EXISTS (SELECT 1 FROM reports WHERE (reports.type = 'profile' OR reports.type = 'message') AND reports.dataId = '"+userTo+"' AND activities.dataId = reports.id)");
						await query("DELETE FROM activities WHERE activities.actId = '43' AND activities.user = '"+userTo+"' AND EXISTS (SELECT 1 FROM reports WHERE (reports.type = 'profile' OR reports.type = 'message') AND reports.dataId = '"+userFrom+"' AND activities.dataId = reports.id)");
						await query("DELETE FROM friends WHERE (userFrom = '"+userFrom+"' AND userTo = '"+userTo+"') OR (userTo = '"+userFrom+"' AND userFrom = '"+userTo+"')");
						await query("DELETE FROM notifications WHERE type = '5' AND ((userFrom = '"+userFrom+"' AND userTo = '"+userTo+"') OR (userTo = '"+userFrom+"' AND userFrom = '"+userTo+"'))");
						if(loggedInUsers.hasKey(userFrom)){
							emitSockets = loggedInUsers[userFrom];
							emitSockets = emitSockets.filter(function(elem, index, selv){
								return index === selv.indexOf(elem) && elem != '';
							});
							for(i = 0; i < emitSockets.length; i++){
								emitSocketId = emitSockets[i];
								socket.broadcast.to(emitSocketId).emit('removeFriend', userTo);
							}
						}
						if(loggedInUsers.hasKey(userTo)){
							emitSockets = loggedInUsers[userTo];
							emitSockets = emitSockets.filter(function(elem, index, selv){
								return index === selv.indexOf(elem) && elem != '';
							});
							for(i = 0; i < emitSockets.length; i++){
								emitSocketId = emitSockets[i];
								socket.broadcast.to(emitSocketId).emit('removeFriend', userFrom);
							}
						}
					}
					if(blockOpt.tags){
						await query("DELETE FROM notifications WHERE type = '0' AND action = '0' AND ((userFrom = '"+userFrom+"' AND userTo = '"+userTo+"') OR (userTo = '"+userFrom+"' AND userFrom = '"+userTo+"'))");
						await query("DELETE FROM notifications WHERE type IN (2, 3) AND action = '4' AND ((userFrom = '"+userFrom+"' AND userTo = '"+userTo+"') OR (userTo = '"+userFrom+"' AND userFrom = '"+userTo+"'))");
						myQuery = await query("SELECT * FROM posts WHERE postType = 'profile' AND ((user = '"+userTo+"' AND FIND_IN_SET('"+userFrom+"', mentionedUsers)) OR (user = '"+userFrom+"' AND FIND_IN_SET('"+userTo+"', mentionedUsers)))");
						if(myQuery.length > 0){
							for(i = 0; i < myQuery.length; i++){
								mySql = myQuery[i];
								id = mySql.id;
								user = mySql.user;
								postText = mySql.postText;
								mentionedUsers = mySql.mentionedUsers.split(',');
								if(user == userFrom)
									bUser = userTo
								else
									bUser = userFrom;
								mentionedUsers = removeFromArray(bUser, mentionedUsers);
								mentionedUsers = mentionedUsers.join(',');
								postText = removeTag(postText, bUser);
								await query("UPDATE posts SET postText = '"+postText+"', mentionedUsers = '"+mentionedUsers+"' WHERE id = "+id);
							}
						}
						myQuery = await query("SELECT * FROM comments WHERE type = 'profile' AND ((user = '"+userTo+"' AND FIND_IN_SET('"+userFrom+"', mentionedUsers)) OR (user = '"+userFrom+"' AND FIND_IN_SET('"+userTo+"', mentionedUsers)))");
						if(myQuery.length > 0){
							for(i = 0; i < myQuery.length; i++){
								mySql = myQuery[i];
								id = mySql.id;
								user = mySql.user;
								comment = mySql.comment;
								mentionedUsers = mySql.mentionedUsers.split(',');
								if(user == userFrom)
									bUser = userTo
								else
									bUser = userFrom;
								mentionedUsers = removeFromArray(bUser, mentionedUsers);
								mentionedUsers = mentionedUsers.join(',');
								comment = removeTag(comment, bUser);
								await query("UPDATE comments SET comment = '"+comment+"', mentionedUsers = '"+mentionedUsers+"' WHERE id = "+id);
							}
						}
						myQuery = await query("SELECT * FROM replies WHERE type = 'profile' AND ((user = '"+userTo+"' AND FIND_IN_SET('"+userFrom+"', mentionedUsers)) OR (user = '"+userFrom+"' AND FIND_IN_SET('"+userTo+"', mentionedUsers)))");
						if(myQuery.length > 0){
							for(i = 0; i < myQuery.length; i++){
								mySql = myQuery[i];
								id = mySql.id;
								user = mySql.user;
								comment = mySql.comment;
								mentionedUsers = mySql.mentionedUsers.split(',');
								if(user == userFrom)
									bUser = userTo
								else
									bUser = userFrom;
								mentionedUsers = removeFromArray(bUser, mentionedUsers);
								mentionedUsers = mentionedUsers.join(',');
								comment = removeTag(comment, bUser);
								await query("UPDATE replies SET comment = '"+comment+"', mentionedUsers = '"+mentionedUsers+"' WHERE id = "+id);
							}
						}
					}
					if(blockOpt.likes){
						array = [0, 2, 4, 5, 7, 9, 11];
						joinedArr = array.join(',');
						arrayX = [6, 7, 14, 15, 16, 17];
						joinedArrX = arrayX.join(',');
						await query("DELETE FROM activities WHERE activities.actId IN ("+joinedArrX+") AND activities.user = '"+userFrom+"' AND EXISTS (SELECT 1 FROM posts WHERE posts.user = '"+userTo+"' AND posts.postType = 'profile' AND activities.dataId = posts.id)");
						await query("DELETE FROM activities WHERE activities.actId IN ("+joinedArrX+") AND activities.user = '"+userTo+"' AND EXISTS (SELECT 1 FROM posts WHERE posts.user = '"+userFrom+"' AND posts.postType = 'profile' AND activities.dataId = posts.id)");
						await query("DELETE FROM activities WHERE activities.actId IN (8, 9, 20, 21) AND activities.user = '"+userFrom+"' AND EXISTS (SELECT 1 FROM comments WHERE comments.user = '"+userTo+"' AND comments.type = 'profile' AND activities.dataId = comments.id)");
						await query("DELETE FROM activities WHERE activities.actId IN (8, 9, 20, 21) AND activities.user = '"+userTo+"' AND EXISTS (SELECT 1 FROM comments WHERE comments.user = '"+userFrom+"' AND comments.type = 'profile' AND activities.dataId = comments.id)");
						await query("DELETE FROM activities WHERE activities.actId IN (10, 11, 22, 23) AND activities.user = '"+userFrom+"' AND EXISTS (SELECT 1 FROM replies WHERE replies.user = '"+userTo+"' AND replies.type = 'profile' AND activities.dataId = replies.id)");
						await query("DELETE FROM activities WHERE activities.actId IN (10, 11, 22, 23) AND activities.user = '"+userTo+"' AND EXISTS (SELECT 1 FROM replies WHERE replies.user = '"+userFrom+"' AND replies.type = 'profile' AND activities.dataId = replies.id)");
						await query("DELETE FROM notifications WHERE type = '1' AND action IN ("+joinedArr+") AND ((userFrom = '"+userFrom+"' AND userTo = '"+userTo+"') OR (userTo = '"+userFrom+"' AND userFrom = '"+userTo+"'))");
						queryStr = "SELECT * FROM (SELECT id AS rId, postId FROM postlike WHERE user = '"+userTo+"') AS t ";
						queryStr += "INNER JOIN posts ON t.postId = id WHERE user = '"+userFrom+"' AND postType = 'profile' UNION ";
						queryStr += "SELECT * FROM (SELECT id AS rId, postId FROM postlike WHERE user = '"+userFrom+"') AS t ";
						queryStr += "INNER JOIN posts ON t.postId = id WHERE user = '"+userTo+"' AND postType = 'profile'";
						myQuery = await query(queryStr);
						if(myQuery.length > 0){
							for(i = 0; i < myQuery.length; i++){
								mySql = myQuery[i];
								rId = mySql.rId;
								await query("DELETE FROM postlike WHERE id = "+rId);
							}
						}
						queryStr = "SELECT * FROM (SELECT id AS rId, comId AS dataId, 'comments' AS tab, 'comlike' AS rTab FROM comlike WHERE user = '"+userTo+"') AS t ";
						queryStr += "INNER JOIN comments ON t.dataId = id WHERE user = '"+userFrom+"' AND type = 'profile' UNION ";
						queryStr += "SELECT * FROM (SELECT id AS rId, comId AS dataId, 'comments' AS tab, 'comlike' AS rTab FROM comlike WHERE user = '"+userFrom+"') AS t ";
						queryStr += "INNER JOIN comments ON t.dataId = id WHERE user = '"+userTo+"' AND type = 'profile' UNION ";
						queryStr += "SELECT * FROM (SELECT id AS rId, repId AS dataId, 'replies' AS tab, 'replike' AS rTab FROM replike WHERE user = '"+userTo+"') AS t ";
						queryStr += "INNER JOIN replies ON t.dataId = id WHERE user = '"+userFrom+"' AND type = 'profile' UNION ";
						queryStr += "SELECT * FROM (SELECT id AS rId, repId AS dataId, 'replies' AS tab, 'replike' AS rTab FROM replike WHERE user = '"+userFrom+"') AS t ";
						queryStr += "INNER JOIN replies ON t.dataId = id WHERE user = '"+userTo+"' AND type = 'profile'";
						myQuery = await query(queryStr);
						if(myQuery.length > 0){
							for(i = 0; i < myQuery.length; i++){
								mySql = myQuery[i];
								rId = mySql.rId;
								dataId = mySql.dataId;
								tab = mySql.tab;
								rTab = mySql.rTab;
								await query("DELETE FROM "+rTab+" WHERE id = "+rId);
								await query("UPDATE "+tab+" SET relevance = relevance - 1 WHERE id = "+dataId);
							}
						}
					}
					if(blockOpt.comments){
						array = [0, 2, 6];
						joinedArr = array.join(',');
						await query("DELETE FROM notifications WHERE type IN (2, 3) AND action IN ("+joinedArr+") AND ((userFrom = '"+userFrom+"' AND userTo = '"+userTo+"') OR (userTo = '"+userFrom+"' AND userFrom = '"+userTo+"'))");
						await query("DELETE FROM activities WHERE activities.actId = '1' AND activities.user = '"+userFrom+"' AND EXISTS (SELECT 1 FROM comments WHERE activities.dataId = comments.id AND EXISTS (SELECT 1 FROM posts WHERE posts.user = '"+userTo+"' AND posts.postType = 'profile' AND comments.postId = posts.id))");
						await query("DELETE FROM activities WHERE activities.actId = '1' AND activities.user = '"+userTo+"' AND EXISTS (SELECT 1 FROM comments WHERE activities.dataId = comments.id AND EXISTS (SELECT 1 FROM posts WHERE posts.user = '"+userFrom+"' AND posts.postType = 'profile' AND comments.postId = posts.id))");
						await query("DELETE FROM activities WHERE activities.actId = '2' AND activities.user = '"+userFrom+"' AND EXISTS (SELECT 1 FROM replies WHERE activities.dataId = replies.id AND EXISTS (SELECT 1 FROM comments WHERE comments.user = '"+userTo+"' AND comments.type = 'profile' AND replies.comId = comments.id))");
						await query("DELETE FROM activities WHERE activities.actId = '2' AND activities.user = '"+userTo+"' AND EXISTS (SELECT 1 FROM replies WHERE activities.dataId = replies.id AND EXISTS (SELECT 1 FROM comments WHERE comments.user = '"+userFrom+"' AND comments.type = 'profile' AND replies.comId = comments.id))");
						queryStr = "SELECT * FROM (SELECT id AS repId, comId FROM replies WHERE user = '"+userTo+"' AND type = 'profile') AS t ";
						queryStr += "INNER JOIN comments ON t.comId = id WHERE user = '"+userFrom+"' AND type = 'profile' UNION ";
						queryStr += "SELECT * FROM (SELECT id AS repId, comId FROM replies WHERE user = '"+userFrom+"' AND type = 'profile') AS t ";
						queryStr += "INNER JOIN comments ON t.comId = id WHERE user = '"+userTo+"' AND type = 'profile'";
						myQuery = await query(queryStr);
						if(myQuery.length > 0){
							for(i = 0; i < myQuery.length; i++){
								mySql = myQuery[i];
								comId = mySql.comId;
								repId = mySql.repId;
								await query("DELETE FROM replies WHERE id = "+repId);
								await query("UPDATE comments SET relevance = relevance - 1 WHERE id = "+comId);
							}
						}
						queryStr = "SELECT * FROM (SELECT id AS comId, postId FROM comments WHERE user = '"+userTo+"' AND type = 'profile') AS t ";
						queryStr += "INNER JOIN posts ON t.postId = id WHERE user = '"+userFrom+"' AND postType = 'profile' UNION ";
						queryStr += "SELECT * FROM (SELECT id AS comId, postId FROM comments WHERE user = '"+userFrom+"' AND type = 'profile') AS t ";
						queryStr += "INNER JOIN posts ON t.postId = id WHERE user = '"+userTo+"' AND postType = 'profile'";
						myQuery = await query(queryStr);
						if(myQuery.length > 0){
							for(i = 0; i < myQuery.length; i++){
								mySql = myQuery[i];
								comId = mySql.comId;
								await query("DELETE FROM comments WHERE id = "+comId);
								await query("DELETE FROM replies WHERE comId = "+comId);
							}
						}
					}
					await query("INSERT INTO blocked VALUES('0', '"+userFrom+"', '"+userTo+"')");
					await query("INSERT INTO activities VALUES('0', '"+userFrom+"', 47, '"+userTo+"', '"+date+"')");
				} else {
					//await query("DELETE FROM blocked WHERE userFrom = '"+userFrom+"' AND userTo = '"+userTo+"'");
					//await query("INSERT INTO activities VALUES('0', '"+userFrom+"', 48, '"+userTo+"', '"+date+"')");
				}
				socket.emit('blocked', [userTo, blocking, name]);
			} finally {
				//connect.end();
			}
		})();
	})
	
	function sendMessage(array){
		msgId = array.msgId;
		userFrom = array.userFrom;
		userTo = array.userTo;
		msgBody = array.msgBody;
		type = array.type;
		files = array.newFiles;
		msgRef = array.msgRef;
		sentCnt = array.sentCnt;
		msgRefData = array.msgRefData;
		date = array.date;
		dateX = array.dateX;
		time = array.time;
		audioType = array.audioType;
		msgText = msgBody.replace(/[']/g, "\\'");
		(async () => {
			try {
				blocked = await isBlocked(userFrom, userTo);
				if(blocked){
					socket.emit('scratched', sentCnt);
					return;
				}
				await query("UPDATE startmsg SET userFromDate = '"+dateX+"', userToDate = '"+dateX+"', type = 'normal' WHERE id = "+msgId);
				await query("UPDATE allmsgs SET seen = '1' WHERE msgId = '"+msgId+"' AND userTo = '"+userFrom+"' AND seen = '0'");
				await query("DELETE FROM archives WHERE user = '"+userFrom+"' AND msgId = '"+msgId+"'");
				insertQuery = await query("INSERT INTO allmsgs VALUES('0', '"+msgId+"', '"+userFrom+"', '"+userTo+"', '"+msgText+"', '"+files+"', '"+type+"', '"+msgRef+"', '0', '0', '0', '"+dateX+"', '"+time+"', '0')");
				id = insertQuery.insertId;
				queryMsgCnt = "SELECT count(*) as count FROM allmsgs WHERE msgId = '"+msgId+"' AND seen = '0' AND userTo = '"+userTo+"'";
				queryUserFromInfos = "SELECT fName as fName, lName as lName, photo as photo FROM accounts WHERE id = '"+userFrom+"'";
				queryUserToInfos = "SELECT fName as fName, lName as lName, photo as photo FROM accounts WHERE id = '"+userTo+"'";
				msgCntAwait = await query(queryMsgCnt);
				msgCnt = msgCntAwait[0].count;
				userFromInfos = await query(queryUserFromInfos);
				userFromName = userFromInfos[0].fName + ' ' + userFromInfos[0].lName;
				userFromPhoto = userFromInfos[0].photo;
				userToInfos = await query(queryUserToInfos);
				userToName = userToInfos[0].fName + ' ' + userToInfos[0].lName;
				userToPhoto = userToInfos[0].photo;
				userFromInfo = {
					name : userFromName,
					photo : userFromPhoto
				};
				userToInfo = {
					name : userToName,
					photo : userToPhoto
				};
				blocked = await isMsgBlocked(userFrom, userTo);
				array['id'] = id;
				array['dlvd'] = 0;
				array['seen'] = 0;
				array['msgCnt'] = msgCnt;
				array['userFromInfo'] = userFromInfo;
				array['userToInfo'] = userToInfo;			
				array['blocked'] = blocked;			
				socket.emit('submitMessageId', array);
				emitSockets = new Array();
				if(connectedMessagePages.hasKey(userFrom)){
					if(connectedMessagePages[userFrom].hasKey(userTo))
						emitSockets = emitSockets.concat(connectedMessagePages[userFrom][userTo]);
				}
				if(connectedMessagePages.hasKey(userTo)){
					if(connectedMessagePages[userTo].hasKey(userFrom))
						emitSockets = emitSockets.concat(connectedMessagePages[userTo][userFrom]);
				}
				if(connectedInboxPages.hasKey(userFrom))
					emitSockets = emitSockets.concat(connectedInboxPages[userFrom]);
				if(connectedInboxPages.hasKey(userTo))
					emitSockets = emitSockets.concat(connectedInboxPages[userTo]);
				if(loggedInUsers.hasKey(userTo))
					emitSockets = emitSockets.concat(loggedInUsers[userTo]);
				emitSockets = emitSockets.filter(function(elem, index, selv){
					return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
				});
				for(i = 0; i < emitSockets.length; i++){
					emitSocketId = emitSockets[i];
					socket.broadcast.to(emitSocketId).emit('submitMessage', array);
				}
			} finally {
				//connect.end();
			}
		})();
	}
	
	function sendForwardMessage(){
		objectKeys = Object.keys(pendingPromises[socket.id]);
		userTo = objectKeys[0];
		array = pendingPromises[socket.id][userTo];
		delete pendingPromises[socket.id][userTo];
		array['userTo'] = userTo;
		userFrom = array.userFrom;
		msgBody = array.msgBody;
		type = array.type;
		files = array.newFiles;
		msgRef = array.msgRef;
		sentCnt = array.sentCnt;
		msgRefData = array.msgRefData;
		date = array.date;
		dateX = array.dateX;
		time = array.time;
		audioType = array.audioType;
		msgText = msgBody.replace(/[']/g, "\\'");
		(async () => {
			try {
				blocked = await isBlocked(userFrom, userTo);
				if(!blocked){
					msgIdQuery = await query("SELECT * FROM startmsg WHERE (userFrom = '"+userFrom+"' AND userTo = '"+userTo+"') OR (userTo = '"+userFrom+"' AND userFrom = '"+userTo+"')");
					msgId = msgIdQuery[0].id;
					array['msgId'] = msgId;
					await query("UPDATE startmsg SET userFromDate = '"+dateX+"', userToDate = '"+dateX+"', type = 'normal' WHERE id = "+msgId);
					await query("UPDATE allmsgs SET seen = '1' WHERE msgId = '"+msgId+"' AND userTo = '"+userFrom+"' AND seen = '0'");
					await query("DELETE FROM archives WHERE user = '"+userFrom+"' AND msgId = '"+msgId+"'");
					insertQuery = await query("INSERT INTO allmsgs VALUES('0', '"+msgId+"', '"+userFrom+"', '"+userTo+"', '"+msgText+"', '"+files+"', '"+type+"', '"+msgRef+"', '0', '0', '0', '"+dateX+"', '"+time+"', '0')");
					id = insertQuery.insertId;
					queryMsgCnt = "SELECT count(*) as count FROM allmsgs WHERE msgId = '"+msgId+"' AND seen = '0' AND userTo = '"+userTo+"'";
					queryUserFromInfos = "SELECT fName as fName, lName as lName, photo as photo FROM accounts WHERE id = '"+userFrom+"'";
					queryUserToInfos = "SELECT fName as fName, lName as lName, photo as photo FROM accounts WHERE id = '"+userTo+"'";
					msgCntAwait = await query(queryMsgCnt);
					msgCnt = msgCntAwait[0].count;
					userFromInfos = await query(queryUserFromInfos);
					userFromName = userFromInfos[0].fName + ' ' + userFromInfos[0].lName;
					userFromPhoto = userFromInfos[0].photo;
					userToInfos = await query(queryUserToInfos);
					userToName = userToInfos[0].fName + ' ' + userToInfos[0].lName;
					userToPhoto = userToInfos[0].photo;
					userFromInfo = {
						name : userFromName,
						photo : userFromPhoto
					};
					userToInfo = {
						name : userToName,
						photo : userToPhoto
					};
					blocked = await isMsgBlocked(userFrom, userTo);
					array['id'] = id;
					array['dlvd'] = 0;
					array['seen'] = 0;
					array['msgCnt'] = msgCnt;
					array['userFromInfo'] = userFromInfo;
					array['userToInfo'] = userToInfo;
					array['blocked'] = blocked;
					socket.emit('submitMessageId', array);
					emitSockets = new Array();
					if(connectedMessagePages.hasKey(userFrom)){
						if(connectedMessagePages[userFrom].hasKey(userTo))
							emitSockets = emitSockets.concat(connectedMessagePages[userFrom][userTo]);
					}
					if(connectedMessagePages.hasKey(userTo)){
						if(connectedMessagePages[userTo].hasKey(userFrom))
							emitSockets = emitSockets.concat(connectedMessagePages[userTo][userFrom]);
					}
					if(connectedInboxPages.hasKey(userFrom))
						emitSockets = emitSockets.concat(connectedInboxPages[userFrom]);
					if(connectedInboxPages.hasKey(userTo))
						emitSockets = emitSockets.concat(connectedInboxPages[userTo]);
					emitSockets = emitSockets.filter(function(elem, index, selv){
						return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
					});
					for(i = 0; i < emitSockets.length; i++){
						emitSocketId = emitSockets[i];
						socket.broadcast.to(emitSocketId).emit('submitMessage', array);
					}
				}
				if(Object.keys(pendingPromises[socket.id]).length > 0)
					sendForwardMessage();
			} finally {
				//connect.end();
			}
		})();
	}
	
	function executeMessageDelete(id, msgId, userFrom, userTo, deletable, emitObj){
		legit = true;
		(async () => {
			try {
				await query("DELETE FROM allmsgs WHERE id = '"+id+"' AND deleted = "+userTo);
				await query("UPDATE allmsgs SET deleted = '"+userFrom+"' WHERE id = '"+id+"'");
				if(deletable)
					await query("DELETE FROM allmsgs WHERE id = '"+id+"'");
				queryMsgCnt = "SELECT count(*) as count FROM allmsgs WHERE msgId = '"+msgId+"' AND seen = '0' AND userTo = '"+userTo+"'";
				queryUserFromInfos = "SELECT fName as fName, lName as lName, photo as photo FROM accounts WHERE id = '"+userFrom+"'";
				queryUserToInfos = "SELECT fName as fName, lName as lName, photo as photo FROM accounts WHERE id = '"+userTo+"'";
				lastMsgDataUserFromQuery = await query("SELECT * FROM allmsgs WHERE msgId = '"+msgId+"' AND deleted != '"+userFrom+"' ORDER BY id DESC LIMIT 1");
				lastMsgDataUserToQuery = await query("SELECT * FROM allmsgs WHERE msgId = '"+msgId+"' AND deleted != '"+userTo+"' ORDER BY id DESC LIMIT 1");
				availableMsg = await query("SELECT count(*) as count FROM allmsgs WHERE msgId = '"+msgId+"' LIMIT 1");
				lastMsgDataUserFrom = new Object();
				lastMsgDataUserTo = new Object();
				lastMsgDataUserFromCount = Object.keys(lastMsgDataUserFromQuery[0]).length;
				lastMsgDataUserToCount = Object.keys(lastMsgDataUserToQuery[0]).length;
				if(availableMsg[0].count == 0){
					legit = false;
					await query("UPDATE startmsg SET type = 'abstract' WHERE id = '"+msgId+"'");
				}
				else {
					if(lastMsgDataUserFromCount > 0){
						lastMsgDataUserFrom = lastMsgDataUserFromQuery[0];
						lastMsgDateUserFrom = lastMsgDataUserFrom.date;
						lastMsgDateUserFrom = lastMsgDateUserFrom.toISOString().slice(0, 19).replace('T', ' ');
						await query("UPDATE startmsg SET userFromDate = '"+lastMsgDateUserFrom+"' WHERE id = '"+msgId+"' AND userFrom = '"+userFrom+"'");
						await query("UPDATE startmsg SET userToDate = '"+lastMsgDateUserFrom+"' WHERE id = '"+msgId+"' AND userTo = '"+userFrom+"'");
						lastMsgDataUserFrom['msgBody'] = lastMsgDataUserFrom['text'];
						lastMsgDataUserFrom['curTime'] = lastMsgDataUserFrom.time;			
					}
					if(lastMsgDataUserToCount > 0){
						lastMsgDataUserTo = lastMsgDataUserToQuery[0];
						lastMsgDateUserTo = lastMsgDataUserTo.date;
						lastMsgDateUserTo = lastMsgDateUserTo.toISOString().slice(0, 19).replace('T', ' ');
						await query("UPDATE startmsg SET userFromDate = '"+lastMsgDateUserTo+"' WHERE id = '"+msgId+"' AND userFrom = '"+userTo+"'");
						await query("UPDATE startmsg SET userToDate = '"+lastMsgDateUserTo+"' WHERE id = '"+msgId+"' AND userTo = '"+userTo+"'");
						lastMsgDataUserTo['msgBody'] = lastMsgDataUserTo['text'];
						lastMsgDataUserTo['curTime'] = lastMsgDataUserTo.time;
					}
				}
				msgCntAwait = await query(queryMsgCnt);
				msgCnt = msgCntAwait[0].count;
				emitObj['msgCnt'] = msgCnt;
				userFromInfos = await query(queryUserFromInfos);
				userFromName = userFromInfos[0].fName + ' ' + userFromInfos[0].lName;
				userFromPhoto = userFromInfos[0].photo;
				userToInfos = await query(queryUserToInfos);
				userToName = userToInfos[0].fName + ' ' + userToInfos[0].lName;
				userToPhoto = userToInfos[0].photo;
				userToInfo = {
					name : userFromName,
					photo : userFromPhoto
				};
				userFromInfo = {
					name : userToName,
					photo : userToPhoto
				};
				lastMsgDataUserFrom['userInfo'] = userFromInfo;
				lastMsgDataUserTo['userInfo'] = userToInfo;
				if(connectedMessagePages.hasKey(userFrom)){
					if(connectedMessagePages[userFrom].hasKey(userTo)){
						lastMsgFromMe = false;
						if(lastMsgDataUserFromCount > 0 && lastMsgDataUserFrom.userFrom == userFrom)
							lastMsgFromMe = true;
						if(lastMsgDataUserFromCount == 0)
							legit = false;
						emitObj['lastMsgFromMe'] = lastMsgFromMe;
						emitObj['msgData'] = lastMsgDataUserFrom;
						emitObj['legit'] = legit;
						emitSockets = connectedMessagePages[userFrom][userTo];
						emitSockets = emitSockets.filter(function(elem, index, selv){
							return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
						});
						for(i = 0; i < emitSockets.length; i++){
							emitSocketId = emitSockets[i];
							socket.broadcast.to(emitSocketId).emit('deleteMessage', emitObj);
						}
					}
				}
				if(connectedMessagePages.hasKey(userTo)){
					if(connectedMessagePages[userTo].hasKey(userFrom)){
						lastMsgFromMe = false;
						if(lastMsgDataUserToCount > 0 && lastMsgDataUserTo.userFrom == userTo)
							lastMsgFromMe = true;
						if(lastMsgDataUserToCount == 0)
							legit = false;
						emitObj['lastMsgFromMe'] = lastMsgFromMe;
						emitObj['msgData'] = lastMsgDataUserTo;
						emitObj['legit'] = legit;
						emitSockets = connectedMessagePages[userTo][userFrom];
						emitSockets = emitSockets.filter(function(elem, index, selv){
							return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
						});
						for(i = 0; i < emitSockets.length; i++){
							emitSocketId = emitSockets[i];
							socket.broadcast.to(emitSocketId).emit('deleteMessage', emitObj);
						}
					}
				}
				if(connectedInboxPages.hasKey(userFrom)){
					lastMsgFromMe = false;
					if(lastMsgDataUserFromCount > 0 && lastMsgDataUserFrom.userFrom == userFrom)
						lastMsgFromMe = true;
					if(lastMsgDataUserFromCount == 0)
						legit = false;
					emitObj['lastMsgFromMe'] = lastMsgFromMe;
					emitObj['msgData'] = lastMsgDataUserFrom;
					emitObj['legit'] = legit;
					emitSockets = connectedInboxPages[userFrom];
					emitSockets = emitSockets.filter(function(elem, index, selv){
						return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
					});
					for(i = 0; i < emitSockets.length; i++){
						emitSocketId = emitSockets[i];
						socket.broadcast.to(emitSocketId).emit('deleteMessage', emitObj);
					}
				}
				if(connectedInboxPages.hasKey(userTo)){
					lastMsgFromMe = false;
					if(lastMsgDataUserToCount > 0 && lastMsgDataUserTo.userFrom == userTo)
						lastMsgFromMe = true;
					if(lastMsgDataUserToCount == 0)
						legit = false;
					emitObj['lastMsgFromMe'] = lastMsgFromMe;
					emitObj['msgData'] = lastMsgDataUserTo;
					emitObj['legit'] = legit;
					emitSockets = connectedInboxPages[userTo];
					emitSockets = emitSockets.filter(function(elem, index, selv){
						return index === selv.indexOf(elem) && elem != '' && elem != socket.id;
					});
					for(i = 0; i < emitSockets.length; i++){
						emitSocketId = emitSockets[i];
						socket.broadcast.to(emitSocketId).emit('deleteMessage', emitObj);
					}
				}
			} finally {
				//connect.end();
			}
		})();
	}
	
})

function userPrefSettings(user, tab){
	return new Promise((resolve, reject) => {
		(async () => {
			try {
				res = true;
				setQuery = await query("SELECT * FROM settings WHERE user = '"+user+"' AND type = '"+tab+"'");
				numRows = setQuery.length;
				if(numRows == 1){
					opt = setQuery[0].opt;
					if(opt == 1)
						res = false;
				}
				resolve(res);
			} finally {
				//connect.end();
			}
		})();
	})
}
	
function isBlocked(userOne, userTwo){
	return new Promise((resolve, reject) => {
		(async () => {
			try {
				blockQuery = await query("SELECT COUNT(*) AS count FROM blocked WHERE (userFrom = '"+userOne+"' AND userTo = '"+userTwo+"') OR (userFrom = '"+userTwo+"' AND userTo = '"+userOne+"')");
				numRows = blockQuery[0].count;
				if(numRows > 0)
					res = true;
				else
					res = false;
				resolve(res);
			} finally {
				//connect.end();
			}
		})();
	})
}
	
function isMsgBlocked(userOne, userTwo){
	return new Promise((resolve, reject) => {
		(async () => {
			try {
				blockQuery = await query("SELECT COUNT(*) AS count FROM msgblock WHERE (userFrom = '"+userOne+"' AND userTo = '"+userTwo+"') OR (userFrom = '"+userTwo+"' AND userTo = '"+userOne+"')");
				numRows = blockQuery[0].count;
				if(numRows > 0)
					res = true;
				else
					res = false;
				resolve(res);
			} finally {
				//connect.end();
			}
		})();
	})
}
	
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
					myQuery = await query("INSERT INTO startmsg VALUES('0', '"+userOne+"', '"+userTwo+"', '"+date+"', '"+date+"', 'abstract', '0')");
					msgId = myQuery.insertId;
				}
				resolve(msgId);
			} finally {
				//connect.end();
			}
		})();
	})
}
	
function getBlockedArray(user){
	array = new Array();
	return new Promise((resolve, reject) => {
		(async () => {
			try {
				blockQuery = await query("SELECT userFrom AS user FROM blocked WHERE userTo = '"+user+"' UNION SELECT userTo AS user FROM blocked WHERE userFrom = '"+user+"'");
				if(blockQuery.length > 0){
					for(i = 0; i < blockQuery.length; i++)
						array.push(blockQuery[i].user);
				}
				resolve(array);
			} finally {
				//connect.end();
			}
		})();
	})
}

function getTags(htmlText, user, blockArray){
	friend = 'friend';
	page = 'page';
	tagsData = new Object();
	data = new Object();
	mentionedUsers = new Array();
	mentionedPages = new Array();
	dom = new JSDOM(`<!DOCTYPE html><div>`+htmlText+`</div>`);
	anchorNodes = dom.window.document.getElementsByTagName("a");
	if(anchorNodes.length > 0){
		spanOpen = '<span style="background-color:#F9F9F9;">';
		bOpen = '<b>';
		aClose = '<\/a>';
		bClose = '<\/b>';
		spanClose = '<\/span>';
		strE = '(.*?)';
		for(i = 0; i < anchorNodes.length; i++){
			anchorNode = anchorNodes[i];
			anchorHref = anchorNode.href.toLowerCase();
			anchorHrefArray = anchorHref.split('-');
			firstWord = anchorHrefArray[0];
			if(firstWord == friend){
				tUser = anchorHrefArray[1];
				if(!inArray(tUser, blockArray))
					mentionedUsers.push();
				else {
					aOpen = '<a href="Friend-'+tUser+'-(.*?)">';
					htmlText = htmlText.replace(new RegExp(spanOpen + bOpen + aOpen + strE + aClose + bClose + spanClose, "g"), '$2')
										.replace(new RegExp(spanOpen + aOpen + bOpen + strE + bClose + aClose + spanClose, "g"), '$2')
										.replace(new RegExp(bOpen + spanOpen + aOpen + strE + aClose + spanClose + bClose, "g"), '$2')
										.replace(new RegExp(bOpen + aOpen + spanOpen + strE + spanClose + aClose + bClose, "g"), '$2')
										.replace(new RegExp(aOpen + spanOpen + bOpen + strE + bClose + spanClose + aClose, "g"), '$2')
										.replace(new RegExp(aOpen + bOpen + spanOpen + strE + spanClose + bClose + aClose, "g"), '$2');
				}
			}
			if(firstWord == page)
				mentionedPages.push(anchorHrefArray[1]);
		}
	}
	tagsData['mentionedUsers'] = mentionedUsers;
	tagsData['mentionedPages'] = mentionedPages;
	data['text'] = htmlText;
	data['tagsData'] = tagsData;
	
	return data;
}

function removeTag(htmlText, user){
	friend = 'friend';
	dom = new JSDOM(`<!DOCTYPE html><div>`+htmlText+`</div>`);
	anchorNodes = dom.window.document.getElementsByTagName("a");
	if(anchorNodes.length > 0){
		spanOpen = '<span style="background-color:#F9F9F9;">';
		bOpen = '<b>';
		aClose = '<\/a>';
		bClose = '<\/b>';
		spanClose = '<\/span>';
		strE = '(.*?)';
		for(i = 0; i < anchorNodes.length; i++){
			anchorNode = anchorNodes[i];
			anchorHref = anchorNode.href.toLowerCase();
			anchorHrefArray = anchorHref.split('-');
			firstWord = anchorHrefArray[0];
			if(firstWord == friend){
				tUser = anchorHrefArray[1];
				if(tUser == user) {
					aOpen = '<a href="Friend-'+tUser+'-(.*?)">';
					htmlText = htmlText.replace(new RegExp(spanOpen + bOpen + aOpen + strE + aClose + bClose + spanClose, "g"), '$2')
										.replace(new RegExp(spanOpen + aOpen + bOpen + strE + bClose + aClose + spanClose, "g"), '$2')
										.replace(new RegExp(bOpen + spanOpen + aOpen + strE + aClose + spanClose + bClose, "g"), '$2')
										.replace(new RegExp(bOpen + aOpen + spanOpen + strE + spanClose + aClose + bClose, "g"), '$2')
										.replace(new RegExp(aOpen + spanOpen + bOpen + strE + bClose + spanClose + aClose, "g"), '$2')
										.replace(new RegExp(aOpen + bOpen + spanOpen + strE + spanClose + bClose + aClose, "g"), '$2');
				}
			}
		}
	}
	
	return htmlText;
}

function inArray(elem, array){
	len = array.length;
	array = array.filter(function(ele){
		return ele != elem;
	});
	newLen = array.length;
	if(newLen == len)
		return false;
	return true;
}

function strToTime(dateStr){
	dateStr += ' UTC';
	var timeStamp = Date.parse(dateStr) / 1000;
	return timeStamp;
}

function removeFromArray(value, array){
	return array.filter(function(ele){
		return ele != value;
	})
}

function getMessageCount(msgId, user, cb){
	$query = "SELECT * FROM allmsgs WHERE msgId = '"+msgId+"' AND seen = '0' AND userTo = '"+user+"'";
	return connect.query($query, function(err, rows){
		cb(rows.length);
	})
}

function getLastMsgData(user, msgId, cb){
	$query = "SELECT * FROM allmsgs WHERE msgId = '"+msgId+"' AND deleted != '"+user+"' ORDER BY id DESC LIMIT 1";
	return connect.query($query, function(err, rows){
		sql = rows[0];
		cb(sql);
	})
}

function getUserInfo(user, field, cb){
	$query = "SELECT * FROM accounts WHERE id = "+user;
	return connect.query($query, function(err, rows){
		sql = rows[0];
		cb(sql[field]);
	});
}

function getUserInfoObjct(user, cb){
	$query = "SELECT * FROM accounts WHERE id = "+user;
	return connect.query($query, function(err, rows){
		sql = rows[0];		
		cb(sql);
	})
}

function callback(err, data){
	if(!err)
		return data;
}