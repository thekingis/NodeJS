/* basicAuth

Enfore basic authentication by providing a callback(user, pass), 
which must return true in order to gain access. Alternatively an 
async method is provided as well, invoking callback(user, pass, 
callback). Populates req.remoteUser. The final alternative is 
simply passing username / password strings. */

var connect = require('connect');
 
connect(connect.basicAuth('username', 'password'));

connect(
  connect.basicAuth(function(user, pass){
    return 'tj' == user & 'wahoo' == pass;
  })
);

connect(
  connect.basicAuth(function(user, pass, fn){
    User.authenticate({ user: user, pass: pass }, fn);
  })
);