//Released to the public domain.
var http           = require('http')
,	fs             = require('fs')
,	path           = require('path')
,	socketio       = require('socket.io')
,	ioProxy        = require('./ioProxy')
,	PageProxy      = require('./pageproxy')
,	PhantomSpawner = require('./phantomspawner')
,	stub           = fs.readFileSync(path.join(__dirname, "stub.html"))
,	debug          = console.log
;

// Our http server 'request' event listener, 
// that simple serve stub.html which will be 'eaten' by phantom
var httpReqListener = function (req, res) {
	res.writeHead(200, { "Content-Type": "text/html" });
	res.end(stub);
};


module.exports = {
	create: function (userCallback, userOptions) {
		if (!userOptions) { userOptions = {} };
		if (!userOptions.phantomPath) { userOptions.phantomPath = 'phantomjs' };
		if (!userOptions.parameters)  { userOptions.parameters  = {} };

		var server = http.createServer(httpReqListener);
		server.listen(function () {
			var	io   = socketio.listen(server, { 'log level': 1})
			,	spawner = new PhantomSpawner({
					options: userOptions,
					io:      io,
					userClb: userCallback,
					pages: {},
					cmdid: 0,
					cmds: {},
					spawnded: function (phantom) {
						new ioProxy(spawner);
						spawner.prematureExitOn();
					}
				});
		});
	}
};