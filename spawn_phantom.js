var child         = require('child_process')
,	spawn_phantom = (function() {
	var self = function (options) {
		self.port     = options.port;
		self.io       = options.io;
		self.opts     = options.options;
		// self.initCompletedCallback = options.spawnded;
		self.spawndedCallback = options.spawnded;
		self.spawn();
		self.bindEvents();
		self.spawnded();
	};

	self.spawn = function() {
		var args = [];
		for (var parm in self.opts.parameters) {
			args.push('--' + parm + '=' + self.opts.parameters[parm]);
		}
		args = args.concat([__dirname + '/bridge.js', self.port]);
		self.phantom_ps = child.spawn(self.opts.phantomPath, args);
	};

	self.hasErrors = false;

	self.bindEvents = function() {
		var phantom = self.phantom_ps;
		phantom.stdout.on('data', self.stdout_data);
		phantom.stderr.on('data', self.stderr_data);
		phantom.on('error', self.phantom_error);
		phantom.on('exit', self.phantom_error);
	};

	self.spawnded = function() {
		process.nextTick(function() {
			self.spawndedCallback(self.hasErrors, self.phantom_ps);
		});
	};
	
	// 
	self.prematureExitOn = function() {
		// An exit event listener that is registered AFTER the phantomjs process
		// is successfully created.
		self.prematureExitHandler = function (code, signal) {
			console.warn('phantom crash: code ' + code);
			self.io.httpServer.close();
		};
		self.phantom_ps.on('exit', self.prematureExitHandler);
	};
	//an exit is no longer premature now
	self.prematureExitOff = function() {
		self.phantom_ps.removeListener('exit', self.prematureExitHandler);
	};
	
	// Event handlers
	self.stdout_data = function (data) {
		console.log('phantom stdout: ' + data);
	};
	self.stderr_data = function (data) {
		console.log('phantom stderr: ' + data);
	};
	self.phantom_error = function (data) {
		self.hasErrors = true;
	};

  return self;
})();


module.exports = spawn_phantom;