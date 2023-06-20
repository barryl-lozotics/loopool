const express = require('express');
const mongojs = require('mongojs');
const async = require('async');

const mongodb = require('mongodb');
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;

const { Readable } = require('stream');


var router = express.Router();


//
// helper functions for user-token handling -- shared code
var accessTokenLifetime = 60000;

function getUserForAccessToken(dbHandle, reqToken, callback) {
//	console.log('>>>> getUserForAccessToken: [%s]', reqToken);

	//
	// fetch token data, if it exists
	var userToken = {};
	var tokenFound = false;
	var tokenExpired = false;

	dbHandle.tlTokens.find({}, {}, function (err, docs) {
		if (err) { callback(err); }

//		console.log('>>>> db returned [%d] tokens', docs.length);

		docs.forEach(function (nextDoc) {
			if (nextDoc._id == reqToken) {
//				console.log('>>>>> found user token: %s', JSON.stringify(nextDoc));

				userToken._id = nextDoc._id;
				userToken.userId = nextDoc.userId;
				userToken.created = nextDoc.created;
			}
		});

		if (userToken._id !== undefined) {
			tokenFound = true;

			//
			// check expiration
			var now = new Date();
			var tokenDate = new Date(userToken.created);

			var tokenLife = (now - tokenDate) / 1000;
			var tokenExp = accessTokenLifetime / 1000;
//			console.log('>>>>> token is [%d] seconds old, expiration is [%d]', tokenLife, tokenExp);

			if (tokenLife > tokenExp) {
				console.log('>>>>> accessToken is EXPIRED');
				tokenExpired = true;
			}
		}

		if (tokenFound == true && tokenExpired == false) {
//			console.log('>>>> returning userToken: %s', JSON.stringify(userToken));
			callback(userToken);
		} else {
			console.log('>>>> ERROR: token not found or invalid');
			callback(null);
		}
	});
}


/*
 * command input
 */
router.post('/new', 
		  function(req, res) {
	var mongojsDb = req.db;

	console.log('>>> loopoolEvents/new');
//	console.log('>>>> body: %s', JSON.stringify(req.body));

	var theRecord = {};

	var eventTimestamp = new Date();
	theRecord.eventTimestamp = eventTimestamp.toISOString();

	theRecord.user = req.body.user;
	theRecord.incomingIP = req.body.incomingIP;
	theRecord.userAgent = req.body.userAgent;
	theRecord.secChUa = req.body.secChUa;
	theRecord.secChUaPlatform = req.body.secChUaPlatform;

	theRecord.loadName = req.body.loadName;

	console.log('>>>> theRecord: %s', JSON.stringify(theRecord));

	//
	// address db
	mongojsDb.loopoolEvents.insert(theRecord, function(err, result){
		if (err) {
			console.log('>>>>> DB error: %s', err);
		} else {
			//
			// respond
			res.send( { msg: '' });
		}
	});

});











































/*
 * GET objectives for a specific user
 */
router.get('/user', function(req, res) {
	var mongojsDb = req.db;

	var mongojsSysDb = req.sysDb;
	var reqToken = req.query.at;
	var userToken = getUserForAccessToken(mongojsSysDb, reqToken, function(userToken) {

		if (userToken == null) {
			console.log('>>> objectives/get: at: [%s] TOKEN INVALID', reqToken);

			res.json(null);

		} else {
			var targetId = userToken.userId;
			console.log('>>> objectives/get for user id [%s]', targetId);

			var objsArray = [];
			var areasArray = [];

			async.waterfall([
				function (callback) {
					//
					// fetch objectives list from db
					//
					mongojsDb.objectives.find({ 'authUserId': targetId }, {}, function (err, data) {
						if (err) { console.log('>>>> DB ERROR: %s', err); callback(err); }

						console.log('>>>>> db returned [%d] objective records', data.length);

						data.forEach(function(nextD) {
							objsArray.push(nextD);
						});

						callback(null);
					});
				},

				//
				// fetch areas
				function (callback) {
					//
					// fetch lifeAreas list from db
					//
					mongojsDb.lifeAreas.find({ 'authUserId': targetId }, {}, function (err, data) {
						if (err) { console.log('>>>> DB ERROR: %s', err); callback(err); }

						data.forEach(function(nextD) {
							areasArray.push(nextD);
						});

						callback(null);
					});
				},

				//
				// fetch colors from lifeareas
				function(callback) {
					//
					// look up for objective and populate color
					objsArray.forEach(function(nextObj) {
						nextObj.areaColor = 'areaNotFound';

						areasArray.forEach(function(nextArea) {

							if (nextArea._id == nextObj.areaRef) {
								nextObj.areaColor = nextArea.areaColor;
							}
						});
					});

					callback(null);
				},

				function (callback) {

					/*
					 //
					 // group by eventType
					 data.sort(function(a, b) {
						if (a.eventType > b.eventType) {
							return 1;
						} else if (a.eventType == b.eventType) {
							return 0;
						} else {
							return -1;
						}
					 });
					 */

					//
					// respond with json
					//
					console.log('>>> returning [%d] objectives', objsArray.length);

					res.json(objsArray);

					callback();

				}
			]);
		}
	});
});


/*
 * add a new objective
 */
router.post('/add', 
		  function(req, res) {
	var mongojsDb = req.db;

	console.log('>>> objectives/add');

	console.log('>>>> body: %s', JSON.stringify(req.body));

	
	var theRecord = {};
	
	theRecord.authUserId = req.body.authUserId;

	theRecord.objectiveName = req.body.objectiveName;
	theRecord.areaRef = req.body.areaRef;
	theRecord.objectiveNotes = req.body.objectiveNotes;
	theRecord.rank = req.body.rank;

	//
	// tacitly-defined fields
	theRecord.objectiveStatus = 'active';

	var objCreation = new Date();
	theRecord.objectiveCreationDate = objCreation.toLocaleDateString();


	console.log('>>>> adding data: %s', JSON.stringify(theRecord));

	//
	// address db
	mongojsDb.objectives.insert(theRecord, function(err, result){
		if (err) {
			console.log('>>>>> DB error: %s', err);
		} else {
			//
			// respond
			res.send( { msg: '' });
		}

	});
});


/*
 * modify an existing objective
 */
router.post('/modify', 
		  function(req, res) {
	var mongojsDb = req.db;

	console.log('>>> objectives/modify');

	console.log('>>>> body: %s', JSON.stringify(req.body));

	
	var theRecord = {};

	//
	// key values
	theRecord.authUserId = req.body.authUserId;
	theRecord._id = req.body._id;

	//
	// modifable items
	theRecord.objectiveName = req.body.objectiveName;
	theRecord.objectiveNotes = req.body.objectiveNotes;

	theRecord.areaRef = req.body.areaRef;

	//
	// these can't be updated
//	theRecord.rank = req.body.rank;			// this way, see /rank method

	console.log('>>>> modified data: %s', JSON.stringify(theRecord));

	//
	// address db
	var o_id = ObjectID(theRecord._id);
	mongojsDb.objectives.findAndModify({
		query: { '_id': o_id },
		update: {
			$set: {
				'objectiveName' : theRecord.objectiveName,
				'objectiveNotes' : theRecord.objectiveNotes,

				'areaRef' : theRecord.areaRef,			}
		},
		upsert: false
	}, function (err, doc, lastErrorObject) {
		if (err) {
			console.log('>>>> ERROR: DB reports: %s', err);
		}

//					console.log('>>>> [%s] DB updated', objId);

		res.send( { msg: '' });
	});

});



/*
 * set rank for an objective
 */
router.post('/rank', 
		  function(req, res) {
	var mongojsDb = req.db;

	console.log('>>> objectives/rank');
	console.log('>>>> body: %s', JSON.stringify(req.body));

	var theRequest = {};

	theRequest.authUserId = req.body.authUserId;

	theRequest.objectiveId = req.body.objective;
	theRequest.rank = parseInt(req.body.newRank);

	var theObjectives = [];
	var objectivesFound = 0;
	var objectivesProcessed = 0;
	async.waterfall([

		function(callback) {
			// 
			// fetch objectives for this user
			mongojsDb.objectives.find( { 'authUserId' : theRequest.authUserId }, {}, function(err, docs) {
				if (err) { console.log('>>> ERR: %s', err); callback(err); }

				docs.forEach(function(nextDoc) {
					theObjectives.push(nextDoc);
				});
			
				objectivesFound = theObjectives.length;

				//
				// sort by rank, descending
				theObjectives.sort(function(a, b) {
					var aRank = parseInt(a.rank);
					var bRank = parseInt(b.rank);

					return (aRank - bRank);
				});

//				console.log('>>>> [%d] objectives found for this user', objectivesFound);

				callback(null); 
			});
		},

		function(callback) {
			//
			// iterate objectives
			var randomRank = 0;
			async.forEachLimit(theObjectives, 1, function(nextObj, objCb) {

				/*
				//
				// database reset
				performTheUpdate(nextObj._id, randomRank++, objCb);
				*/

				var thisRank = parseInt(nextObj.rank);

				if (nextObj._id == theRequest.objectiveId) {
				console.log('>>>>> setting rank for requested obj [%s] to [%d]', theRequest.objectiveId, theRequest.rank);

					performTheUpdate(theRequest.objectiveId, theRequest.rank, objCb);

				} else if (thisRank == theRequest.rank) {
					//
					// swap with previous holder
					console.log('>>>>> setting rank for previous-holder obj [%s] from [%d] to [%d]', nextObj._id, nextObj.rank, (thisRank + 1));

					performTheUpdate(nextObj._id, (thisRank + 1), objCb);

				} else {
//					console.log('>>>>> ignoring obj [%s] with rank [%d]', nextObj._id, nextObj.rank);

					objCb(null);
				}

			}, function(err) {
//				console.log('>>>>> reached end of [%d] objectives', theObjectives.length);
				callback(null);
			});

			function performTheUpdate(objId, newRank, updateCb) {
				var o_id = new ObjectID(objId);
				var rankVal = parseInt(newRank);

				mongojsDb.objectives.findAndModify({
					query: { '_id': o_id },
					update: {
						$set: {
							'rank' : rankVal
						}
					},
					upsert: false
				}, function (err, doc, lastErrorObject) {
					if (err) {
						console.log('>>>> ERROR: DB reports: %s', err);
					}

//					console.log('>>>> [%s] DB updated', objId);
					updateCb(null);
				});
			}
		},

		function(callback) {
			//
			// respond
//			console.log('>>>> rank processing complete');

			res.send( { msg: '' });
		},
	]);

});


/*
 * DELETE an objective
 */
router.post('/delete', 
		  function(req, res) {
	var mongojsDb = req.db;

	var theObjective = {};

	theObjective.objectiveId = req.body.objective;

	console.log('>>> objectives/delete');
	console.log('>>>> deleting objective [%s]', theObjective.objectiveId);

	var o_id = ObjectID(theObjective.objectiveId);

	mongojsDb.objectives.remove({ '_id' : o_id }, function(err, result){
		if (err) {
			res.send( { msg: err });
		}

		//
		// respond
		res.send( { msg: '' });
	});

});


/*
 * CLOSE an objective
 */
router.post('/close', 
		  function(req, res) {
	var mongojsDb = req.db;

	console.log('>>> objectives/close');
	console.log('>>>> closing objective [%s]', req.body.objectiveId);

	var theObjective = {};
	var o_id = ObjectID(req.body.objectiveId);
	var today = new Date();

	async.waterfall([

		// 
		// fetch object
		function(callback) {
			mongojsDb.objectives.findOne( { '_id' : o_id }, {}, function(err, data) {
				if (err) { console.log('>>> ERR: %s', err); callback(err); }

				console.log('>>>>> db returned objective: %s', JSON.stringify(data));

				//
				// deep copy
				theObjective._id = data._id;
				theObjective.authUserId = data.authUserId;
				theObjective.objectiveName = data.objectiveName;
				theObjective.areaRef = data.areaRef;
				theObjective.objectiveNotes = data.objectiveNotes;
				theObjective.rank = data.rank;
				theObjective.objectiveStatus = data.objectiveStatus;
				theObjective.objectiveCreationDate = data.objectiveCreationDate;

				callback(null);
			});
		},

		// 
		// add area name
		function(callback) {
			var area_o_id = ObjectID(theObjective.areaRef);
			mongojsDb.lifeAreas.findOne( { '_id' : area_o_id }, {}, function(err, data) {
				if (err) { console.log('>>> ERR: %s', err); callback(err); }

				theObjective.areaName = data.areaName;

				callback(null);
			});
		},

		//
		// set objective to inactive status
		function(callback) {
			//
			// mark inactive
			console.log('>>>>> setting objective status');
			mongojsDb.objectives.findAndModify({
				query: { '_id': o_id },
				update: {
					$set: {
						'objectiveStatus' : 'inactive',
						'objectiveCloseDate' : today.toLocaleDateString(),
					}
				},
				upsert: false
			}, function (err, doc, lastErrorObject) {
				if (err) {
					console.log('>>>> ERROR: DB reports: %s', err);
				}

				callback(null);

			}); 
		},

		function(callback) {
			console.log('>>>>> de-activate associated tasks');

			mongojsDb.daylistTasks.find({ 'objectiveRef' : theObjective.objectiveId}, function(err, data) {
				if (err) {
					console.log('>>>> ERROR: DB reports: %s', err);
				} else {
					console.log('>>>> DB shows [%d] related tasks', data.length);

					tasksFound = data.length;
				}

				async.forEachLimit(data, 1, function(nextTask, taskCb) {

					console.log('>>>>> [%s]', nextTask._id);

					//
					// build history record
					var histRec = {};

					histRec.eventType = 'objectiveClosed';
					histRec.eventDate = today.toLocaleDateString();
					histRec.eventTimestamp = today.toString();
					histRec.eventNote = '';

					mongojsDb.daylistTasks.findAndModify({
						query: { '_id' : nextTask._id },
						update: {
							$set: {
								'daylistTaskStatus' : 'inactive',
							},
							$push: { taskHistoryArray: histRec }
						},
					}, function() {
						taskCb(null);
					});

				}, function(err) {

					callback(null);
				});
			});
		},

		//
		// add corresponding timelineEvent
		function(callback) {
			console.log('>>>>> add timelineEvent');

			console.log('>>>>> theObjective: %s', JSON.stringify(theObjective));

            var tlEvent = {};

            tlEvent.authUserId = theObjective.authUserId;
            tlEvent.eventName = theObjective.objectiveName;
            tlEvent.eventType = theObjective.areaName;

            var objDate = new Date(theObjective.objectiveCreationDate);
            tlEvent.eventStart = objDate.toISOString();

			//
			// endDate is today
            tlEvent.eventEnd = today.toISOString();

            tlEvent.eventNotes = 'Generated upon closure of gameplan objective';

            tlEvent.source = 'generated';

			mongojsDb.timelineEvents.insert(tlEvent, function(err, result){
				if (err) {
					console.log('>>>>> DB error: %s', err);
				} else {
					callback(null);
				}
			});
		},

		//
		// respond to caller
		function(callback) {
			console.log('>>>> responding');

			res.send( { msg: '' });

			callback(null);
		},

	]);
});

/*
 * (RE-)ACTIVATE an objective
 */
router.post('/activate', 
		  function(req, res) {
	var mongojsDb = req.db;

	var theObjective = {};

	theObjective.objectiveId = req.body.objectiveId;

	console.log('>>> objectives/activate');
	console.log('>>>> activating objective [%s]', theObjective.objectiveId);

	var o_id = ObjectID(theObjective.objectiveId);

	mongojsDb.objectives.findAndModify({
		query: { '_id': o_id },
		update: {
			$set: {
				'objectiveStatus' : 'active',
			},
			$unset: {
				'objectiveCloseDate' : '',
			}
		},
		upsert: false
	}, function (err, doc, lastErrorObject) {
		if (err) {
			res.send( { msg: err });
		}

		//
		// respond
		res.send( { msg: '' });
	}); 
});




/*
 * GET task history for a given objective
 */
router.get('/history', function(req, res) {
	var mongojsDb = req.db;

	var targetObj = req.query.objective;
	console.log('>>> objectives/history for objective [%s]', targetObj);

	var objTasks = [];
	var taskHist = [];
	async.waterfall([

					//
					// fetch all daylistTasks for this objective
					function(callback) {
//	                	 var o_id = new mongo.ObjectID(targetObj);
						mongojsDb.daylistTasks.find( { 'objectiveRef' : targetObj }, {}, function(err, data) {
							if (err) { console.log('>>> ERR: %s', err); callback(err); }

							data.forEach(function(nextD) {
								objTasks.push(nextD);
							});

							console.log('>>>> [%d] daylistTasks for this objective', objTasks.length);

							callback(null); 
						});
					},

					//
					// build array of all taskHistory items for these tasks
					function(callback) {

						objTasks.forEach(function(nextOT) {

							if (nextOT.taskHistoryArray !== undefined && nextOT.taskHistoryArray.length > 0) {

								nextOT.taskHistoryArray.forEach(function(nextTH) {
									var newHistRec = {};

									newHistRec = nextTH;
									newHistRec.daylistTaskName = nextOT.daylistTaskName;

									taskHist.push(newHistRec);
								});
							}
						});

						console.log('>>>> [%d] history items', taskHist.length);

						callback(null);
					},

					//
					// respond to caller
					function (callback) {
						//
						// sort output descending by timestamp
						taskHist.sort(function(a, b) {

							var aDate = new Date(a.eventTimestamp);
							var bDate = new Date(b.eventTimestamp);

							return (bDate - aDate);
						});

						//
						// respond with json
						//
						console.log('>>> returning [%d] task history recs', taskHist.length);

						res.json(taskHist);

						callback(null);
					}

	                ]);	

});

/*
 * GET summary of recent activity
 */
router.get('/summary', function(req, res) {
	var mongojsDb = req.db;

	/*
	var mongojsSysDb = req.sysDb;
	var reqToken = req.query.at;
	var userToken = getUserForAccessToken(mongojsSysDb, reqToken, function(userToken) {

		if (userToken == null) {
			console.log('>>> objectives/get: at: [%s] TOKEN INVALID', reqToken);

			res.json(null);

		} else {
			var targetId = userToken.userId;
	*/
	
	console.log('>>> loopoolEvents/summary');

	var eventsArray = [];
	var areasArray = [];

	async.waterfall([
		function (callback) {
			//
			// fetch events list from db
			//
			mongojsDb.loopoolEvents.find( {}, {}, function (err, data) {
				if (err) { console.log('>>>> DB ERROR: %s', err); callback(err); }

				console.log('>>>>> db returned [%d] event records', data.length);

				data.forEach(function(nextD) {
					eventsArray.push(nextD);
				});

				callback(null);
			});
		},

		/*
		//
		// fetch areas
		function (callback) {
			//
			// fetch lifeAreas list from db
			//
			mongojsDb.lifeAreas.find({ 'authUserId': targetId }, {}, function (err, data) {
				if (err) { console.log('>>>> DB ERROR: %s', err); callback(err); }

				data.forEach(function(nextD) {
					areasArray.push(nextD);
				});

				callback(null);
			});
		},

		//
		// fetch colors from lifeareas
		function(callback) {
			//
			// look up for objective and populate color
			objsArray.forEach(function(nextObj) {
				nextObj.areaColor = 'areaNotFound';

				areasArray.forEach(function(nextArea) {

					if (nextArea._id == nextObj.areaRef) {
						nextObj.areaColor = nextArea.areaColor;
					}
				});
			});

			callback(null);
		},
		*/

		function (callback) {

			/*
				//
				// group by eventType
				data.sort(function(a, b) {
				if (a.eventType > b.eventType) {
					return 1;
				} else if (a.eventType == b.eventType) {
					return 0;
				} else {
					return -1;
				}
				});
				*/

			//
			// respond with json
			//
			console.log('>>> returning [%d] events', eventsArray.length);

			var returnObj = {};
			returnObj.eventsArray = eventsArray;

			res.json(returnObj);

			callback();
		}
	]);
});




//don't add past this line

module.exports = router;
