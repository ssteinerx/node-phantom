var Responder
,	_         = require('lodash')
,	PageProxy = require('./pageproxy')
,	debug     = console.log
;

Responder = (function() {

	function Responder(options) {
		var response  = options.response;
		this.pages    = options.pages;
		this.cmds     = options.cmds;
		this.socket   = options.socket;
		this.request  = options.request;
		this.server   = options.server;
		// 
		this.id       = response[0];
		this.cmdId    = response[1];
		this.cmd      = response[2];
		this.cbData   = response[3];
		this.response = response;
		return this;
	}

	Responder.prototype.dispatch = function() {
		var proto = Responder.prototype
		,	self  = this
		,	run   = false
		;
		_.each(proto, function(v, cmd) {
			if (cmd === self.cmd) {
				self[cmd]();
				run = true;
			};
		});
		if (!run) {
			_.each(proto.mapings, function(pair, i) {
				_.each(pair.keys, function(cmd) {
					if (cmd === self.cmd) {
						pair.handler.call(self);
						run = true;
					};
				});
			});
		};
		if (!run) {
			self.default();
		};
	};

	Responder.prototype.pageCreated = function() {
		debug('pageCreated', this.pages);
		var pageProxy = new PageProxy({
			id:      this.id,
			socket:  this.socket,
			request: this.request
		});
		this.pages[this.id] = pageProxy;
		this.cmds[this.cmdId].cb(null, pageProxy);
		delete this.cmds[this.cmdId];
	};

	Responder.prototype.phantomExited = function() {
		this.request(this.socket, [0, 'exitAck']);
		this.server.close();
		// io.set('client store expiration', 0);
		this.cmds[this.cmdId].cb();
		delete this.cmds[this.cmdId];
	};


	Responder.prototype.pageOpened = function() {
		if (this.cmds[this.cmdId] !== undefined) { //if page is redirected, the pageopen event is called again - we do not want that currently.
			if (this.cmds[this.cmdId].cb !== undefined) {
				this.cmds[this.cmdId].cb(null, this.cbData);
			}
			delete this.cmds[this.cmdId];
		}
	};

	Responder.prototype.pageRenderBase64Done = function() {
		this.cmds[this.cmdId].cb(null, this.cbData);
		delete this.cmds[this.cmdId];
	};

	Responder.prototype.pageClosed = function() {
		delete this.pages[this.id]; // fallthru
	};

	Responder.prototype.default = function() {
		console.error('got unrecognized response:' + this.response);
	};

	Responder.prototype.mapings = [{
		keys: [ 'pageSetDone'
		,       'pageJsIncluded'
		,       'cookieAdded'
		,       'pageRendered'
		,       'pageEventSent'
		,       'pageFileUploaded'
		,       'pageSetViewportDone'
		,       'pageEvaluatedAsync'
		],
		handler: function() {
			this.cmds[this.cmdId].cb(null);
			delete this.cmds[this.cmdId];
		}
	}, {
		keys: ['pageGetDone'
		,      'pageEvaluated'
		],
		handler: function() {
			this.cmds[this.cmdId].cb(null, JSON.parse(this.cbData));
			delete this.cmds[this.cmdId];
		}
	}, {
		keys: ['pageJsInjected'
		,      'jsInjected'
		],
		handler: function() {
			this.cmds[this.cmdId].cb(JSON.parse(this.cbData) === true ? null : true);
			delete this.cmds[this.cmdId];
		}
	}];


	return Responder;
})();

module.exports = Responder;