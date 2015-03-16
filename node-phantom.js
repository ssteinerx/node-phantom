//Released to the public domain.
var http          = require('http')
,	fs            = require('fs')
,	path          = require('path')
,	socketio      = require('socket.io')
,	PageProxy     = require('./pageproxy')
,	PhantomProxy  = require('./phantomproxy')
,	Responder     = require('./responder')
,	spawn_phantom = require('./spawn_phantom')
,	stub          = fs.readFileSync(path.join(__dirname, "stub.html"))
,	debug         = console.log
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
			var port = server.address().port
			,	io   = socketio.listen(server, { 'log level': 1});
			spawn_phantom({
				options: userOptions,
				port:    port,
				io:      io,
				spawnded: function (err, phantom) {
					if (err) {
						debug('spawn_phantom.initCompletedCallback/err', err);
						io.httpServer.close();
						userCallback(true);
						return;
					}
					var pages = {}
					,	cmdid = 0
					,	cmds  = {}
					;

					function request(socket, args, callback) {
						args.splice(1, 0, cmdid);
						socket.emit('cmd', JSON.stringify(args));
						cmds[cmdid] = {
							cb: makeCallback(callback)
						};
						cmdid++;
					}

					io.sockets.on('connection', function (socket) {
						socket.on('res', function (res) {
							debug('socket.res\n', res);
							new Responder({
								response: res,
								pages: pages,
								cmds: cmds,
								socket: socket,
								server: server,
								request: request
							}).dispatch();
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
							request: request,
							phantom: phantom,
							spawn_phantom: spawn_phantom
						}));
					});

					spawn_phantom.prematureExitOn(); // not instance, but class
				}
			});
		});
	}
};