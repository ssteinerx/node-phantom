var fs             = require('fs')
,	path           = require('path')
,	http           = require('http')
,	socketio       = require('socket.io')
,	html           = fs.readFileSync(path.join(__dirname, "stub.html"))
,	ioProxy        = require('./ioProxy')
,	PhantomSpawner = require('./phantomspawner')
,	debug          = console.log
,	_              = require('lodash')
,	NodePhantomBridge;


// debug('attachSocketIOServer');
// _.each(this, function(v, k) { debug(k+' : '+ typeof v); })


NodePhantomBridge = (function() {

	function NodePhantomBridge(options) {
		// options.keys = [userOptions, userOptions]
		this.userOptions  = normalize(options.userOptions);
		this.userCallback = options.userCallback;
		//
		this.pages = {};
		this.cmds  = {};
		this.cmdid = 0;
		//
		this.createHttpServer();	// after this point we have this.httpServer
		this.attachHttpServer();
	}

	NodePhantomBridge.prototype.createHttpServer = function() {
		this.httpServer = http.createServer(httpReqListener);
	};

	NodePhantomBridge.prototype.attachHttpServer = function() {
		this.httpServer.listen(this.onHttpServerListen())
	};

	NodePhantomBridge.prototype.onHttpServerListen = function() {
		var self = this;	// closure
		return function () {
			self.attachSocketIO();	// after this point we have this.io socketio obj
			self.spawnPhantom();	// after this point we have phantom spawnded
		};
	};

	NodePhantomBridge.prototype.attachSocketIO = function() {
		this.io = socketio.listen(this.httpServer, { 'log level': 1});
	};

	NodePhantomBridge.prototype.spawnPhantom = function() {
		var	spawner = new PhantomSpawner({
				bridge:  this,
				spawnded: function () {
					new ioProxy(spawner);
				}
		});
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