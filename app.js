const express = require("express");
const path = require("path");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const helmet = require("helmet");

const routes = require("./routes/index");


//
// Database
//
var dbHandle = {};
var sysDbHandle = {};
var sysDbConnStr = '';

var dbClientHandle = {};


//
// Config manager
const config = require("./local_modules/configMgr");


//
// set up Express app
var app = express();


//
// main flow begins
config.processConfig(function (configDbHandle, configSysDbHandle, configSysDbConnStr, configDbClientHandle) {

	//	console.log('>>>> after processConfig');

	dbHandle = configDbHandle;
	sysDbHandle = configSysDbHandle;
	sysDbConnStr = configSysDbConnStr;

	dbClientHandle = configDbClientHandle;

	//
	// set up view engine

	var configData = config.getConfig();

	var minify = false;
	if (configData.useMinifiedJS !== undefined) {
		var minStr = configData.useMinifiedJS;

		if (minStr == "true") {
			minify = true;
		}
		
	} else {
		minify = configData.environment.production.useMinifiedJS;
	}

	if (minify == true) {
		console.log('>>> useMinifiedJS set true, altering views path');
		app.set('views', [ __dirname + '/views/mini' , __dirname + '/views' ] );
//		app.set('views', path.join(__dirname, 'views/mini'));
		
	} else {
		console.log('>>> useMinifiedJS set false, default views path');
		app.set('views', [ __dirname + '/views' ] );
//		app.set('views', path.join(__dirname, 'views'));
	}
	
	app.set('view engine', 'pug');

	app.use(logger('combined'));
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: false }));

	app.use(cookieParser());

	/*
	app.use(function (req, res, next) {

		// console.log('>>>> req.cookies: %s', JSON.stringify(req.cookies));
		// console.log('>>>> req.session: %s', JSON.stringify(req.session));

		var cookie = req.cookies.tlSession;
		if (cookie == undefined) {
			//
			// no: set a new cookie
			console.log('>>>>> no tlSession cookie found');

			var randomNumber = Math.random().toString();
			randomNumber = randomNumber.substring(2, randomNumber.length);
			res.cookie('tlSession', randomNumber, { maxAge: cookieAge, httpOnly: true });

			logSessionId = randomNumber;
		} else {
			logSessionId = req.cookies.tlSession;

			//		console.log('\n\n>>>> tlSession cookie: [%s]', logSessionId);
		}

		//
		// log metadata from every incoming request
		//
		// for now, take hostname out, since it's not passed through the load-balancer
		//	var logRecord = '[' + req.hostname + ']: ' + req.method + ' ' + req.originalUrl;
		var logRecord = req.method + ' ' + req.originalUrl;
		console.log('\n\n[%s]\t%s\n', logSessionId, logRecord);

		//
		// log session state
		//	logger.log('debug', 'req.session: [%s]', JSON.stringify(req.session));

		next();

	});
	*/

	//
	// use content assets from this path
	app.use(express.static(path.join(__dirname, 'public')));

	/*
	//
	//set up db driver
	app.use(function (req, res, next) {
		req.db = dbHandle;
		req.sysDb = sysDbHandle;

		req.dbClient = dbClientHandle;

		next();
	});
	*/


	//
	// OWASP protection
	app.use(helmet());


	//
	// pass config data in request context
	app.use(function (req, res, next) {
		
		req.configData = config.getConfig();

//	    console.log('>>>> adding configData to request: %s', JSON.stringify(req.configData));

		next();
	});


	//
	// set up middleware
	app.use('/', routes);

	/*

	//
	// add specific routes
	var loopoolEvents = require('./routes/loopoolEvents');
	app.use('/loopoolEvents', loopoolEvents);

	*/

	// error handlers

	/*
	// development error handler
	// will print stacktrace
	app.use(function (err, req, res, next) {
		res.status(err.status || 500);
		res.render(err)
	});
	*/

	// production error handler
	// no stacktraces leaked to user
	app.use(function(err, req, res, next) {
	  res.status(err.status || 500);
	  res.render('error', {
		message: err.message,
		error: {}
	  });
	});
});



module.exports = app;
