//Released to the public domain.
var http     = require('http')
,	fs       = require('fs')
,	path     = require('path')
,	socketio = require('socket.io')
,	child    = require('child_process')
,	test     = require('assert')
,	stub     = fs.readFileSync(path.join(__dirname, "stub.html"))
,	debug    = console.log;

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
	var self = function (port, io, options, callback) {
		self.port     = port;
		self.io       = io;
		self.callback = callback;
		self.opts     = options;
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
			self.callback(self.hasErrors, self.phantom_ps);
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
					socket.on('res', function (response) {
						var id    = response[0]
						,	cmdId = response[1];

						switch (response[2]) {
						case 'pageCreated':
							var pageProxy = {
								open: function (url, callback) {
									if (callback === undefined) {
										request(socket, [id, 'pageOpen', url]);
									} else {
										request(socket, [id, 'pageOpenWithCallback', url], callback);
									}
								}
								, close: function (callback) {
									request(socket, [id, 'pageClose'], callback);
								}
								, render: function (filename, callback) {
									request(socket, [id, 'pageRender', filename], callback);
								}
								, renderBase64: function (extension, callback) {
									request(socket, [id, 'pageRenderBase64', extension], callback);
								}
								, injectJs: function (url, callback) {
									request(socket, [id, 'pageInjectJs', url], callback);
								}
								, includeJs: function (url, callback) {
									request(socket, [id, 'pageIncludeJs', url], callback);
								}
								, sendEvent: function (event, x, y, callback) {
									request(socket, [id, 'pageSendEvent', event, x, y], callback);
								}
								, uploadFile: function (selector, filename, callback) {
									request(socket, [id, 'pageUploadFile', selector, filename], callback);
								}
								, evaluate: function (evaluator, callback) {
									request(socket, [id, 'pageEvaluate', evaluator.toString()].concat(Array.prototype.slice.call(arguments, 2)), callback);
								}
								, evaluateAsync: function (evaluator, callback) {
									request(socket, [id, 'pageEvaluateAsync', evaluator.toString()].concat(Array.prototype.slice.call(arguments, 2)), callback);
								}
								, set: function (name, value, callback) {
									request(socket, [id, 'pageSet', name, value], callback);
								}
								, get: function (name, callback) {
									request(socket, [id, 'pageGet', name], callback);
								}
								, setFn: function (pageCallbackName, fn, callback) {
									request(socket, [id, 'pageSetFn', pageCallbackName, fn.toString()], callback);
								}
								, setViewport: function (viewport, callback) {
									request(socket, [id, 'pageSetViewport', viewport.width, viewport.height], callback);
								}
							}
							pages[id] = pageProxy;
							cmds[cmdId].cb(null, pageProxy);
							delete cmds[cmdId];
							break;
						case 'phantomExited':
							request(socket, [0, 'exitAck']);
							server.close();
							// io.set('client store expiration', 0);
							cmds[cmdId].cb();
							delete cmds[cmdId];
							break;
						case 'pageJsInjected':
						case 'jsInjected':
							cmds[cmdId].cb(JSON.parse(response[3]) === true ? null : true);
							delete cmds[cmdId];
							break;
						case 'pageOpened':
							if (cmds[cmdId] !== undefined) { //if page is redirected, the pageopen event is called again - we do not want that currently.
								if (cmds[cmdId].cb !== undefined) {
									cmds[cmdId].cb(null, response[3]);
								}
								delete cmds[cmdId];
							}
							break;
						case 'pageRenderBase64Done':
							cmds[cmdId].cb(null, response[3]);
							delete cmds[cmdId];
							break;
						case 'pageGetDone':
						case 'pageEvaluated':
							cmds[cmdId].cb(null, JSON.parse(response[3]));
							delete cmds[cmdId];
							break;
						case 'pageClosed':
							delete pages[id]; // fallthru
						case 'pageSetDone':
						case 'pageJsIncluded':
						case 'cookieAdded':
						case 'pageRendered':
						case 'pageEventSent':
						case 'pageFileUploaded':
						case 'pageSetViewportDone':
						case 'pageEvaluatedAsync':
							cmds[cmdId].cb(null);
							delete cmds[cmdId];
							break;
						default:
							console.error('got unrecognized response:' + response);
							break;
						}
					});
					socket.on('push', function (request) {
						var id       = request[0]
						,	cmd      = request[1]
						,	args     = unwrapArray(request[2])
						,	callback = makeCallback(pages[id] ? pages[id][cmd] : undefined)
						;
						callback(args);
					});
					var proxy = {
						createPage: function (callback) {
							request(socket, [0, 'createPage'], callback);
						}
						, injectJs: function (filename, callback) {
							request(socket, [0, 'injectJs', filename], callback);
						}
						, addCookie: function (cookie, callback) {
							request(socket, [0, 'addCookie', cookie], callback);
						}
						, exit: function (callback) {
							spawn_phantom.prematureExitOff(); //an exit is no longer premature now
							request(socket, [0, 'exit'], callback);
						}
						, on: function () {
							phantom.on.apply(phantom, arguments);
						}
						, _phantom: phantom
					};

					callback(null, proxy);
				});

				spawn_phantom.prematureExitOn(); // not instance, but class
			});
		});
	}
};