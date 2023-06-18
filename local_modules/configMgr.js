//
// configMgr.js:  central localization manager
//
// Processes external properties file to configuration trademon run-time environment.
// Designed for reuse in both web-app and tools contexts.
//

var async = require('../node_modules/async');
var mongojs = require('../node_modules/mongojs');
var fs = require('fs');

const mongodb = require('mongodb');
const MongoClient = require('mongodb').MongoClient;

//
// constants
var targetDbName = 'loopool';
var targetSysDbName = 'loopool-system';

var extConfigDirs = [ '..', '../..', '.' ]		// first parent, then grandparent, then local

var configFilename = 'loopool.config';

var k8sConfigDir = '/config';
var k8sConfigFilename = 'application.properties';


//
// cache
var theDbHandle = {};
var theSysDbHandle = {};
var theMainDbConnStr = "";
var theSysDbConnStr = "";

//
// some mongo functions require a handle opened by MongoClient
var theDbClientHandle = {};


var configData = {};
var fullFilename = '';

var k8sConfigFound = false;


//
// helper functions

function findK8sConfig(callback) {
//	console.log('>>> findK8sConfig');

	fs.readdir(k8sConfigDir, function(err, list) {
			
		if (err) { 
			console.log('ERROR: unknown K8sconfig directory [%s]', k8sConfigDir);

		} else {
			list.forEach(function(file) {
				
				if (file.indexOf(k8sConfigFilename) !== -1) {
					console.log('configMgr: K8s config directory found at [%s]', k8sConfigDir);

					fullFilename = k8sConfigDir + '/' + k8sConfigFilename;
					k8sConfigFound = true;
				}
			});
		}

		callback(k8sConfigFound);
	});
}


function findConfig(callback) {

//	console.log('>>> function findConfig called');

	findK8sConfig(function(k8sConfigFound) {

//		console.log('>>>> k8ConfigFound: [%s]', k8sConfigFound);

		if (k8sConfigFound == false) {

			fullFilename = './' + configFilename;			// default to internal version

			//
			// iterate through options, exit on first match found (shallowest upward search)
			//
			var extConfigFound = false;
			
			async.forEachLimit(extConfigDirs, 1, function(extConfigDir, forEachCb) {
		
		//		console.log('configMgr: trying external config directory [%s]', extConfigDir);
		
				fs.readdir(extConfigDir, function(err, list) {
					
					if (err) { 
						console.log('ERROR: unknown external config directory [%s]', extConfigDir);
		
					} else {
						list.forEach(function(file) {
							
							if (file.indexOf(configFilename) !== -1) {
								console.log('configMgr: external config file found at [%s]', extConfigDir);
								fullFilename = extConfigDir + '/' + configFilename;
		
								extConfigFound = true;
							}
						});
					}
					
					if (extConfigFound == true) {
		//				console.log('>>> found a file, exiting to caller');
						callback();
					} else {
						forEachCb();
					}
				});
		
			}, function(err) {
				if (extConfigFound == false) {
					 console.log('>>> configMgr: no external config file found, defaulting to [%s]', fullFilename);
					 callback();
					
				}
				
			});
	

		} else {
			callback();
		}
	});
}

function readConfig(callback) {

//	console.log('>>> function readConfig called, fullFilename: [%s]', fullFilename);
	
	 fs.readFile(fullFilename, 'utf-8', function(err, data) {
		 if (err) {
			 console.log('ERROR: config file read error: %s', err);
			 callback(err);
			 
		 } else {
//			console.log('>>>> Config raw data: %s', data);

			if (k8sConfigFound == true) {

				// split the contents by new line
				const lines = data.split(/\r?\n/);

				lines.forEach(function(nextLine) {
					var nextPropName = '';
					var nextPropValue = '';

					nextPropTuple = nextLine.split('=');

					nextPropName = nextPropTuple[0];
					var splitStr = nextPropName + '=';

					nextPropTuple = nextLine.split(splitStr);

					nextPropValue = nextPropTuple[1];

//					console.log('>>>>> [%s]: [%s]', nextPropName, nextPropValue);

					//
					// legal as of ES6
					configData[nextPropName] = nextPropValue;
				});

//				console.log('>>> k8s config file read, data: %s', JSON.stringify(configData));

				callback(null);

			} else {
				//
				// ... and load config variables
				configData = JSON.parse(data);
//				console.log('>>> config file read, data: %s', JSON.stringify(configData));

				callback(null);
			}

		 }

	 });
}

function dbConfig(callback) {
//	console.log('>>> configMgr:dbConfig called');

	//
	// establish database connections per configuration
	var dbConnStr = "";

	//
	// detect full connection-string - use if available
	//
	// detect K8s connection-string - use if available
	if (configData.mainDbConnectionString !== undefined) {
		console.log('>>>> using K8S connection strings');

		theMainDbConnStr = configData.mainDbConnectionString;
		theSysDbConnStr = configData.sysDbConnectionString;

	} else if (configData.environment.dbConnection.mainDbConnectionString !== undefined) {
		console.log('>>>> using app-local connection strings');

		theMainDbConnStr = configData.environment.dbConnection.mainDbConnectionString;
		theSysDbConnStr = configData.environment.dbConnection.sysDbConnectionString;
	}

	if (theMainDbConnStr.length == 0) {
		//
		// else, build from configuration data (legacy behavior)
		console.log('>>>> using host/port detected in config');

		dbConnStr = 'mongodb://'
			+ configData.environment.dbConnection.host
			+ ':'
			+ configData.environment.dbConnection.port;

		theMainDbConnStr = dbConnStr + '/' + targetDbName;

		//
		// system db -- assume it's aboard the same mongo instance
		theSysDbConnStr = dbConnStr + '/' + targetSysDbName;
	}

//	console.log('>>>> theMainDbConnStr: %s', theMainDbConnStr);


	//
	// add new db tables here
	//
	theDbHandle = mongojs(theMainDbConnStr, ['loopoolEvents'
	]);

	//
	// add new db tables here
	//
	theSysDbHandle = mongojs(theSysDbConnStr, ['loopoolUsers'
	]);

	//
	// this conn string also needs to be returned to callers
//	theSysDbConnStr = sysDbConnStr;


	console.log('configMgr: connecting to PRIMARY database [%s]', targetDbName);

	//
	// add a generic error handler - panic at this point
	theDbHandle.on('error', function (err) {
		console.log('>>> database error: ', err);

		console.log('>>> EXITING');
		process.exit();
	});

	//
	// generate a first transaction, to force the driver to connect
	theDbHandle.loopoolEvents.find({}, {}, function (err, data) {
	});

	//
	// connection handler
	theDbHandle.on('connect', function () {
		console.log('>>> PRIMARY database connected\n');

		//
		// now connect to system db
		console.log('configMgr: connecting to SYSTEM database [%s]', targetSysDbName);

		//
		// add a generic error handler - panic at this point
		theSysDbHandle.on('error', function (err) {
			console.log('>>> database error: ', err);

			console.log('>>> EXITING');
			process.exit();
		});

		//
		// generate a first transaction, to force the driver to connect
		theSysDbHandle.loopoolUsers.findOne({}, {}, function (err, data) {
		});

		//
		// now build the MongoClient variation
		theSysDbHandle.on('connect', function () {
			console.log('>>> SYSTEM database connected\n');

			MongoClient.connect(theMainDbConnStr, { useUnifiedTopology: true }, (err, client) => {
				if (err) {
					console.log('MongoClient Connection Error: %s', err);
					callback();

				} else {
					//
					// finish up

					console.log('>>> MongoClient connected\n\n');
					theDbClientHandle = client.db(targetDbName);

					callback();
				}
			});
	
		});

	});

}


/************************************************************************************************/

//
// module begins
//
module.exports = {

		//
		// test harnesses
		moduleTest: 
			function(data) {
				if (data.length > 0) {
					console.log('>>> configMgr.moduleTest: received data: [%s]', data);
				}
	
				return;
		},

		getConfig:
			function() {
//				console.log('>>> configMgr.getConfig');

				return(configData);
			
		},

		processConfig:
			function processConfig(externalCb) {
			async.waterfall([
			                 function(callback) {
			                	 findConfig(callback);
			                 },

			                 function(callback) {
			                	 readConfig(callback);
			                 },

			                 function(callback) {
								 dbConfig(function() {
									 externalCb(theDbHandle, theSysDbHandle, theSysDbConnStr, theDbClientHandle);
								 });
			                 }

			                 ]);

		}


};	// end of module
