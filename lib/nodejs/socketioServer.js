var PhantomProxy   = require('./phantomproxy')
,	PushResponder  = require('./push_responder')
,	ResResponder   = require('./res_responder')
,	ioProxy;

ioProxy = (function() {
	function ioProxy(spawner) {
		this.spawner = spawner;
		this.userClb = spawner.userClb;
		spawner.io.sockets.on('connection', this.onConnection());
		spawner.prematureExitOn();
	};

	ioProxy.prototype.onConnection =  function () {
		var self = this;
		return function(socket) {
			self.socket = socket;
			self.bindSocketMsgHandlers()
			self.userClb(null, new PhantomProxy({
				socket: self.socket,
				spawner: self.spawner
			}));
		};
	};

	ioProxy.prototype.bindSocketMsgHandlers = function() {
		this.socket.on('res', this.onSocketResMsg());
		this.socket.on('push', this.onSocketPushMsg());
	};

	ioProxy.prototype.onSocketResMsg = function() {
		var self = this;
		return function(res) {
			new ResResponder({
				response: res,
				socket: self.socket,
				spawner: self.spawner
			})
		};
	};

	ioProxy.prototype.onSocketPushMsg = function() {
		var self = this;
		return function (req) {
			new PushResponder({
				request: req,
				spawner: self.spawner
			});
		};
	};

	return ioProxy;
})();

module.exports = ioProxy;