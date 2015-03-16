var fs             = require('fs')
,	path           = require('path')
,	http           = require('http')
,	socketio       = require('socket.io')
,	html           = fs.readFileSync(path.join(__dirname, "stub.html"))
,	ioProxy        = require('./ioProxy')
,	PhantomSpawner = require('./phantomspawner')
,	NodePhantomBridge;


NodePhantomBridge = (function() {

	function NodePhantomBridge(options) {
		// options.keys = [userOptions, userOptions]
		this.userOptions  = normalize(options.userOptions);
		this.userCallback = options.userCallback;
		this.createHttpServer()	// after this point we have this.httpServer
		this.attachServer()		// after this point we have this.httpServer
	}

	NodePhantomBridge.prototype.createHttpServer = function() {
		this.httpServer = http.createServer(httpReqListener);
	};

	NodePhantomBridge.prototype.attachServer = function() {
		this.httpServer.listen(this.onHttpServerListen())
	};

	NodePhantomBridge.prototype.onHttpServerListen = function() {
		var self = this;	// closure
		return function () {
			var	io   = socketio.listen(self.httpServer, { 'log level': 1})
			,	spawner = new PhantomSpawner({
					options: self.userOptions,
					io:      io,
					userClb: self.userCallback,
					pages: {},
					cmdid: 0,
					cmds: {},
					spawnded: function (phantom) {
						new ioProxy(spawner);
						spawner.prematureExitOn();
					}
				});
		};
	};

	// 'private'

	var httpReqListener = function (req, res) {
		// Our http server 'request' event listener, that simple serve stub.html which will be 'eaten' by phantom
		res.writeHead(200, { "Content-Type": "text/html" });
		res.end(html);
	};

	var normalize = function(opts) {
		if (!opts) { opts = {} };
		if (!opts.phantomPath) { opts.phantomPath = 'phantomjs' };
		if (!opts.parameters)  { opts.parameters  = {} };
		return opts;
	};

  return NodePhantomBridge;

})();


module.exports = NodePhantomBridge