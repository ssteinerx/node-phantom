//Released to the public domain.
var http           = require('http')
,	fs             = require('fs')
,	path           = require('path')
,	socketio       = require('socket.io')
,	PageProxy      = require('./pageproxy')
,	PhantomProxy   = require('./phantomproxy')
,	ResResponder   = require('./res_responder')
,	PushResponder  = require('./push_responder')
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
			,	pages = {}
			,	cmdid = 0
			,	cmds  = {}
			,	spawner = new PhantomSpawner({
					options: userOptions,
					io:      io,
					userClb: userCallback,

					pages: pages,
					cmdid: cmdid,
					cmds: cmds,

					spawnded: function (phantom) {
						io.sockets.on('connection', function (socket) {
							socket.on('res', function (res) {
								new ResResponder({
									response: res,
									socket: socket,
									spawner: spawner
								})
							});
							socket.on('push', function (req) {
								new PushResponder({
									request: req,
									spawner: spawner
								})
							});
							userCallback(null, new PhantomProxy({
								socket: socket,
								spawner: spawner
							}));
						});

						spawner.prematureExitOn(); // not instance, but class
					}
				});
		});
	}
};