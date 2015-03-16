//Released to the public domain.
var http         = require('http')
,	fs           = require('fs')
,	path         = require('path')
,	socketio     = require('socket.io')
,	child        = require('child_process')
,	test         = require('assert')
,	PageProxy    = require('./pageproxy')
,	PhantomProxy = require('./phantomproxy')
,	Responder    = require('./responder')
,	stub         = fs.readFileSync(path.join(__dirname, "stub.html"))
,	debug        = console.log
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

var spawn_phantom = (function() {
	var self = function (port, io, options, initCompletedCallback) {
		self.port     = port;
		self.io       = io;
		self.opts     = options;
		self.initCompletedCallback = initCompletedCallback;
		self.spawn();
		self.bindEvents();
		self.initComplete();
	};

	self.spawn = function() {
		var args = [];
		for (var parm in self.opts.parameters) {
			args.push('--' + parm + '=' + self.opts.parameters[parm]);
		}
		args = args.concat([__dirname + '/bridge.js', self.port]);
		self.phantom_ps = child.spawn(self.opts.phantomPath, args);
	};

	self.hasErrors = false;

	self.bindEvents = function() {
		var phantom = self.phantom_ps;
		phantom.stdout.on('data', self.stdout_data);
		phantom.stderr.on('data', self.stderr_data);
		phantom.on('error', self.phantom_error);
		phantom.on('exit', self.phantom_error);
	};

	self.initComplete = function() {
		process.nextTick(function() {
			self.initCompletedCallback(self.hasErrors, self.phantom_ps);
		});
	};

	self.prematureExitOn = function() {
		// An exit event listener that is registered AFTER the phantomjs process
		// is successfully created.
		self.prematureExitHandler = function (code, signal) {
			console.warn('phantom crash: code ' + code);
			self.io.httpServer.close();
		};
		self.phantom_ps.on('exit', self.prematureExitHandler);
	};
	//an exit is no longer premature now
	self.prematureExitOff = function() {
		self.phantom_ps.removeListener('exit', self.prematureExitHandler);
	};
	self.stdout_data = function (data) {
		console.log('phantom stdout: ' + data);
	};
	self.stderr_data = function (data) {
		console.log('phantom stderr: ' + data);
	};
	self.phantom_error = function (data) {
		self.hasErrors = true;
	};

  return self;
})();



module.exports = {
	create: function (callback, options) {
		if (options === undefined) options = {};
		if (options.phantomPath === undefined) options.phantomPath = 'phantomjs';
		if (options.parameters === undefined) options.parameters = {};

		var server = http.createServer(httpReqListener);
		server.listen(function () {
			var port = server.address().port
			,	io   = socketio.listen(server, { 'log level': 1});
			spawn_phantom(port, io, options, function (err, phantom) {
				if (err) {
					debug('spawn_phantom.initCompletedCallback/err', err);
					io.httpServer.close();
					callback(true);
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
					var proxy = new PhantomProxy({
						socket: socket,
						request: request,
						phantom: phantom,
						spawn_phantom: spawn_phantom
					});
					callback(null, proxy);
				});

				spawn_phantom.prematureExitOn(); // not instance, but class
			});
		});
	}
};