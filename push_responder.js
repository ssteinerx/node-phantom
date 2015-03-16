var _             = require('lodash')
,	util          = require('util')
,	PageProxy     = require('./pageproxy')
,	BaseResponder = require('./base_responder')
,	debug         = console.log
,	unwrapArray = function (arr) {
		return arr && arr.length == 1 ? arr[0] : arr
}
,	makeCallback = function (callback) {
		if (callback === undefined) callback = function () {};
		return callback;
}
,	PushResponder = (function() {

	var PushResponder = function PushResponder(options) {
		this.request = options.request;
		this.spawner  = options.spawner;
		this.pages    = this.spawner.pages;
	};

	PushResponder.prototype.default = function() {
		var req = this.request
		debug('socket.push\n', req);
		var id       = req[0]
		,	cmd      = req[1]
		,	args     = unwrapArray(req[2])
		,	callback = makeCallback(this.pages[id] ? this.pages[id][cmd] : undefined)
		;
		callback(args);
	};

	return PushResponder;
})()
;

module.exports = PushResponder;