var	_              = require('lodash')
,	child          = require('child_process')
,	debug          = console.log
,	PhantomSpawner = (function() {
	var PhantomSpawner = function PhantomSpawner(options) {
		this.io          = options.io;
		this.port        = this.io.httpServer.address().port;
		this.opts        = options.options;
		this.spawndedClb = options.spawnded;
		this.userClb     = options.userClb;
		this.hasErrors   = false;
		this.spawn();		// after this point we have this.phantom_ps (result of child.cpawn)
		this.bindEvents(); // after this point we have proxyied this.phantom_ps's io, errors
		this.spawnded();
	};

	PhantomSpawner.prototype.spawn = function() {
		var args = []
		,	params = this.opts.parameters;
		for (var parm in params) {
			args.push('--' + parm + '=' + params[parm]);
		}
		args = args.concat([__dirname + '/bridge.js', this.port]);
		this.phantom_ps = child.spawn(this.opts.phantomPath, args);
	};


	PhantomSpawner.prototype.bindEvents = function() {
		var phantom = this.phantom_ps;
		phantom.stdout.on('data', this.stdout_data);
		phantom.stderr.on('data', this.stderr_data);
		phantom.on('error', this.phantom_errOrexit());
		phantom.on('exit',  this.phantom_errOrexit());
	};

	PhantomSpawner.prototype.spawnded = function() {
		self = this;
		process.nextTick(function() {
			if (self.hasErrors) {
				self.spawndErr.call(self);
			} else {
				self.spawndedClb(self.phantom_ps);
			};
		});
	};

	PhantomSpawner.prototype.spawndErr = function() {
		debug('PhantomSpawner::spawndErr');
		this.io.httpServer.close();
		this.phantom_ps.kill();
		this.userClb(true);
	};

	// An exit event listener that is registered AFTER the phantomjs process is successfully created.
	PhantomSpawner.prototype.prematureExitOn = function() {
		var self = this;
		this.exitHandler = function (code, signal) {
			console.warn('phantom crash: code ' + code);
			self.io.httpServer.close();
		};
		this.phantom_ps.on('exit', this.exitHandler);
	};

	// An exit is no longer premature now
	PhantomSpawner.prototype.prematureExitOff = function() {
		this.phantom_ps.removeListener('exit', this.exitHandler);
	};

	// Events handlers
	PhantomSpawner.prototype.stdout_data = function (data) {
		console.log('phantom stdout: ' + data);
	};

	PhantomSpawner.prototype.stderr_data = function (data) {
		console.log('phantom stderr: ' + data);
	};

	PhantomSpawner.prototype.phantom_errOrexit = function() {
		var self = this;
		return function (data) {
			self.hasErrors = true;
		};
	};

	return PhantomSpawner;
})();


module.exports = PhantomSpawner;