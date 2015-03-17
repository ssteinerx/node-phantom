var log = console.log;
module.exports = function(section) {
	var f, level = process.env.DEBUG;
	if (level && (level === "*" || level === section)) {
		f = function(msg) {  log('DEBUG '+section+' :'+msg); };
	} else{
		f = function() {};
	};
	return f;
};