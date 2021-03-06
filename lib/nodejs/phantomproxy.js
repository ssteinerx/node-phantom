var PhantomProxy = function PhantomProxy(options) {
	this.socket   = options.socket;
	this.phantom  = options.phantom;
	this.spawner  = options.spawner;
	this.request  = this.spawner.request();
	return this;
};

PhantomProxy.prototype.createPage = function (callback) {
	this.request( this.socket
				, [0, 'createPage']
				, callback );
};

PhantomProxy.prototype.injectJs = function (filename, callback) {
	this.request( this.socket
				, [0, 'injectJs', filename]
				, callback );
};

PhantomProxy.prototype.addCookie = function (cookie, callback) {
	this.request( this.socket
				, [0, 'addCookie', cookie]
				, callback );
};

PhantomProxy.prototype.exit = function (callback) {
	this.spawner.prematureExitOff(); //an exit is no longer premature now
	this.request( this.socket
				, [0, 'exit']
				, callback );

};

PhantomProxy.prototype.on = function () {
	this.phantom.on.apply(this.phantom, arguments);
};

module.exports = PhantomProxy;