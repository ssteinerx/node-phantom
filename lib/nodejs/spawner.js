var	_              = require('lodash')
,	child          = require('child_process')
,	path           = require('path')
,	socketioServer = require('./socketioServer')
,	debug          = require('./debug')('spawner')
,	Spawner = (function() {
		function Spawner(bridge) {
			this.bridge      = bridge;
			this.initVars()
			this.spawn();		// after this point we have this.phantom_ps (result of child.cpawn)
			this.bindEvents();	// after this point we have proxyied this.phantom_ps's io, errors
			this.done();
		};

		//
		// Lifecycle sequence of init methods
		//

		Spawner.prototype.initVars = function() {
			var bridge   = this.bridge;
			this.io      = bridge.io;
			this.userClb = bridge.userCallback;
			this.opts    = bridge.userOptions;
			this.pages   = bridge.pages;
			this.cmdid   = bridge.cmdid;
			this.cmds    = bridge.cmds;
			//
			this.port           = this.io.httpServer.address().port;
			this.hasErrors      = false;
			this.phantom_script = path.join(__dirname, "../phantomjs/main.js");
		};

		Spawner.prototype.spawn = function() {
			var args = []
			,	params = this.opts.parameters;
			for (var parm in params) {
				args.push('--' + parm + '=' + params[parm]);
			}
			args = args.concat([this.phantom_script, this.port]);
			this.phantom_ps = child.spawn(this.opts.phantomPath, args);
		};


		Spawner.prototype.bindEvents = function() {
			var phantom = this.phantom_ps;
			phantom.stdout.on('data', this.stdout_data);
			phantom.stderr.on('data', this.stderr_data);
			phantom.on('error', this.phantom_errOrexit());
			phantom.on('exit',  this.phantom_errOrexit());
		};

		Spawner.prototype.done = function() {
			self = this;
			process.nextTick(function() {
				if (self.hasErrors) {
					self.spawnErr.call(self);
				} else {
					new socketioServer(self); // pass spawner
				};
			});
		};

		//
		// 
		//

		// An exit event listener that is registered AFTER the phantomjs process is successfully created.
		Spawner.prototype.prematureExitOn = function() {
			var self = this;
			this.exitHandler = function (code, signal) {
				console.warn('phantom crash: code ' + code);
				self.io.httpServer.close();
			};
			this.phantom_ps.on('exit', this.exitHandler);
		};

		// An exit is no longer premature now
		Spawner.prototype.prematureExitOff = function() {
			this.phantom_ps.removeListener('exit', this.exitHandler);
		};

		// Return request function
		Spawner.prototype.request = function () {
			var self = this;
			return function (socket, args, callback) {
				args.splice(1, 0, self.cmdid);
				socket.emit('cmd', JSON.stringify(args));
				self.cmds[self.cmdid] = {
					cb: makeCallback(callback)
				};
				self.cmdid++;
			};
		}

		//
		// Events handlers
		//

		Spawner.prototype.spawnErr = function() {
			debug('Spawner::spawndErr');
			this.io.httpServer.close();
			this.phantom_ps.kill();
			this.userClb(true);
		};

		Spawner.prototype.phantom_errOrexit = function() {
			var self = this;
			return function (data) {
				self.hasErrors = true;
			};
		};

		Spawner.prototype.stdout_data = function (data) {
			console.log('phantom stdout: ' + data);
		};

		Spawner.prototype.stderr_data = function (data) {
			console.log('phantom stderr: ' + data);
		};

		// 'private'

		var	makeCallback = function (callback) {
			if (callback === undefined) callback = function () {};
			return callback;
		}


		return Spawner;
})();


module.exports = Spawner;