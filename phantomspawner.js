var	_              = require('lodash')
,	child          = require('child_process')
,	debug          = console.log
,	PhantomSpawner = (function() {
	var PhantomSpawner = function PhantomSpawner(options) {
		this.port             = options.port;
		this.io               = options.io;
		this.opts             = options.options;
		this.spawndedCallback = options.spawnded;
		this.hasErrors        = false;
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
			self.spawndedCallback(self.hasErrors, self.phantom_ps);
		});
	};

	PhantomSpawner.prototype.prematureExitOn = function() {
		// An exit event listener that is registered AFTER the phantomjs process
		// is successfully created.
		var self = this;
		this.ExitHandler = function (code, signal) {
			console.warn('phantom crash: code ' + code);
			self.io.httpServiser.close();
		};
		this.phantom_ps.on('exit', this.ExitHandler);
	};
	//an exit is no longer premature now
	PhantomSpawner.prototype.prematureExitOff = function() {
		this.phantom_ps.removeListener('exit', this.ExitHandler);
	};
	// Event handlers
	PhantomSpawner.prototype.stdout_data = function (data) {
		console.log('phantom stdout: ' + data);
	};
	PhantomSpawner.prototype.stderr_data = function (data) {
		console.log('phantom stderr: ' + data);
	};
	PhantomSpawner.prototype.phantom_errOrexit = function() {
		var self = this;
		return function (data) {
			debug('phantom error or exit: ', data);
			self.hasErrors = true;
		};
	};

	return PhantomSpawner;
})();


module.exports = PhantomSpawner;