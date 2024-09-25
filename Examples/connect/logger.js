
/**
 * Module dependencies.
 */

var connect = require('connect');

// $ curl http://localhost:3000/favicon.ico

connect.createServer(
    connect.logger()
  , connect.favicon()
).listen(3000);

