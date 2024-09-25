
/**
 * Module dependencies.
 */

var connect = require('connect');

// $ curl -i http://localhost:3000/favicon.ico

connect.createServer(
  connect.favicon()
).listen(3000);