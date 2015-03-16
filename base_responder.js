var _ = require('lodash')
,	debug = console.log
,	BaseResponder;

BaseResponder = (function() {
	function BaseResponder() {}

	BaseResponder.prototype.dispatch = function() {
		var proto = this.constructor.prototype
		,	self  = this
		,	run   = false
		;
		_.each(proto, function(v, cmd) {
			if (self.canDispatch.call(self, cmd)) {
				self[cmd].call(self);
				run = true;
			};
		});
		if (!run) {
			_.each(proto.mapings, function(pair, i) {
				_.each(pair.keys, function(cmd) {
					if (self.canDispatch.call(self, cmd)) {
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

	BaseResponder.prototype.canDispatch = function(param) {
		return false;
	};

	BaseResponder.prototype.default = function() {
		console.log("BaseResponder::default");
	};

	BaseResponder.prototype.mapings = [];

	return BaseResponder;

})();

module.exports = BaseResponder;