var	NodePhantom = require('./lib/nodejs/bridge');

exports.create = function (clb, opt) {
	new NodePhantom({
		userOptions: opt,
		userCallback: clb
	});
};