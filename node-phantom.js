var	NodePhantomBridge = require('./nodePhantomBridge');

module.exports = {
	create: function (clb, opt) {
		new NodePhantomBridge({
			userOptions: opt,
			userCallback: clb
		});
	}
};