var	NodePhantomBridge = require('./nodePhantomBridge')
,	normalize = function(opts) {
		if (!opts) { opts = {} };
		if (!opts.phantomPath) { opts.phantomPath = 'phantomjs' };
		if (!opts.parameters)  { opts.parameters  = {} };
		return opts;
	};

module.exports = {
	create: function (userCallback, userOptions) {
		new NodePhantomBridge({
			userOptions: normalize(userOptions),
			userCallback: userCallback
		});
	}
};