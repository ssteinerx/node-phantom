var PageProxy = (function() {
	function PageProxy(options) {
		this.socket  = options.socket;
		this.request = options.request;
		this.id = options.id;
		return this;
	}

	PageProxy.prototype.open = function (url, callback) {
		if (callback === undefined) {
			this.request( this.socket
						, [this.id, 'pageOpen', url] );
		} else {
			this.request( this.socket
						, [this.id, 'pageOpenWithCallback', url]
						, callback );
		}
	};

	PageProxy.prototype.close = function (callback) {
		this.request( this.socket
					, [this.id, 'pageClose']
					, callback );
	};

	PageProxy.prototype.render = function (filename, callback) {
		this.request( this.socket
					, [this.id, 'pageRender', filename]
					, callback );
	};

	PageProxy.prototype.renderBase64 = function (extension, callback) {
		this.request( this.socket
					, [this.id, 'pageRenderBase64', extension]
					, callback );
	};

	PageProxy.prototype.injectJs = function (url, callback) {
		this.request( this.socket
					, [this.id, 'pageInjectJs', url]
					, callback );
	};

	PageProxy.prototype.includeJs = function (url, callback) {
		this.request( this.socket
					, [this.id, 'pageIncludeJs', url]
					, callback );
	};

	PageProxy.prototype.sendEvent = function (event, x, y, callback) {
		this.request( this.socket
					, [this.id, 'pageSendEvent', event, x, y]
					, callback );
	};

	PageProxy.prototype.uploadFile = function (selector, filename, callback) {
		this.request( this.socket
					, [this.id, 'pageUploadFile', selector, filename]
					, callback );
	};

	PageProxy.prototype.evaluate = function (evaluator, callback) {
		this.request( this.socket
					, [this.id, 'pageEvaluate', evaluator.toString()].concat(Array.prototype.slice.call(arguments, 2))
					, callback );
	};

	PageProxy.prototype.evaluateAsync = function (evaluator, callback) {
		this.request( this.socket
					, [this.id, 'pageEvaluateAsync', evaluator.toString()].concat( Array.prototype.slice.call(arguments, 2) )
					, callback );
	}

	PageProxy.prototype.set = function (name, value, callback) {
		this.request(this.socket
					, [this.id, 'pageSet', name, value]
					, callback );
	}
	PageProxy.prototype.get = function (name, callback) {
		this.request(this.socket
					, [this.id, 'pageGet', name]
					, callback );
	}
	PageProxy.prototype.setFn = function (pageCallbackName, fn, callback) {
		this.request( this.socket
					, [this.id, 'pageSetFn', pageCallbackName, fn.toString()]
					, callback );
	}
	PageProxy.prototype.setViewport = function (viewport, callback) {
		this.request( this.socket
					, [this.id, 'pageSetViewport', viewport.width, viewport.height]
					, callback );
	}



  return PageProxy;

})();

;
module.exports = PageProxy;
