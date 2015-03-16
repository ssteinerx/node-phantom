var _             = require('lodash')
,	util          = require('util')
,	PageProxy     = require('./pageproxy')
,	BaseResponder = require('./base_responder')
,	debug         = console.log
,	debug         = function() {}
,	ResResponder  = (function() {

	function ResResponder(options) {
		var response  = options.response;

		debug('socket.res', response);

		this.id       = response[0];
		this.cmdId    = response[1];
		this.cmd      = response[2];
		this.cbData   = response[3];
		this.response = response;

		this.socket   = options.socket;
		this.spawner  = options.spawner;

		this.pages    = this.spawner.pages;
		this.cmds     = this.spawner.cmds;
		this.server   = this.spawner.io.httpServer;
		this.request  = this.spawner.request();

		this.dispatch();
	}

	util.inherits(ResResponder, BaseResponder);

	ResResponder.prototype.canDispatch = function(cmd) {
		return this.cmd === cmd;
	};

	ResResponder.prototype.pageCreated = function() {
		var pageProxy = new PageProxy({
			id:      this.id,
			socket:  this.socket,
			request: this.request
		});
		this.pages[this.id] = pageProxy;
		this.cmds[this.cmdId].cb(null, pageProxy);
		delete this.cmds[this.cmdId];
	};

	ResResponder.prototype.phantomExited = function() {
		this.request(this.socket, [0, 'exitAck']);
		this.server.close();
		// io.set('client store expiration', 0);
		this.cmds[this.cmdId].cb();
		delete this.cmds[this.cmdId];
	};


	ResResponder.prototype.pageOpened = function() {
		if (this.cmds[this.cmdId] !== undefined) { //if page is redirected, the pageopen event is called again - we do not want that currently.
			if (this.cmds[this.cmdId].cb !== undefined) {
				this.cmds[this.cmdId].cb(null, this.cbData);
			}
			delete this.cmds[this.cmdId];
		}
	};

	ResResponder.prototype.pageRenderBase64Done = function() {
		this.cmds[this.cmdId].cb(null, this.cbData);
		delete this.cmds[this.cmdId];
	};

	ResResponder.prototype.pageClosed = function() {
		delete this.pages[this.id]; // fallthru
	};

	ResResponder.prototype.default = function() {
		console.error('got unrecognized response:' + this.response);
	};

	ResResponder.prototype.mapings = [{
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


	return ResResponder;
})();

module.exports = ResResponder;