var	Bridge = require('./lib/nodejs/bridge');

exports.create = function (clb, opt) {
	new Bridge({
		userOptions: opt,
		userCallback: clb
	});
};