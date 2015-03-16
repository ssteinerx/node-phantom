//Released to the public domain.
var http           = require('http')
,	fs             = require('fs')
,	path           = require('path')
,	socketio       = require('socket.io')
,	PageProxy      = require('./pageproxy')
,	PhantomProxy   = require('./phantomproxy')
,	ResResponder   = require('./res_responder')
,	PhantomSpawner = require('./phantomspawner')
,	stub           = fs.readFileSync(path.join(__dirname, "stub.html"))
,	debug          = console.log
;

var makeCallback = function (callback) {
	if (callback === undefined) callback = function () {};
	return callback;
};

var unwrapArray = function (arr) {
	return arr && arr.length == 1 ? arr[0] : arr
};

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
								debug('socket.push\n', req);
								var id       = req[0]
								,	cmd      = req[1]
								,	args     = unwrapArray(req[2])
								,	callback = makeCallback(pages[id] ? pages[id][cmd] : undefined)
								;
								callback(args);
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