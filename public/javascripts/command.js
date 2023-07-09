//
// loopool - command module
//

//
// constants
var thisLocation = '/command';
		
//
// cache
var userData = {};

var loadTimer = {};
var loadInterval = 2000;

var loadName = '';

var transTimes = {};
transTimes.totalTime = 0;
transTimes.totalTrans = 0;


//
// controls
var loadingState = false;


//
// DOM Ready =============================================================
$(document).ready(function () {

	var startTime = new Date();

	//
	// prepare query string
	//
	var queryDict = {};
	location.search.substr(1).split("&").forEach(function (item) {
		queryDict[item.split("=")[0]] = item.split("=")[1];
	});

	/*
	var evIndex = queryDict.ev;
	console.log('>>> timelineEvents ev [%s] et [%s] yr [%s]', evIndex, eTypeIndex, targetYear);
	*/
	console.log('>>> loopool command controller');

	/*
	//
	// process input args

	var reqDate = queryDict.reqDate;
	var taskIndex = queryDict.task;

	if (reqDate !== undefined) {
		console.log('>>>> for daylistDate: [%s]', reqDate);
		daylistDate = new Date(reqDate);

		//
		// fix stale browser windows
		var now = new Date();
		if (daylistDate.toLocaleDateString() !== now.toLocaleDateString()) {

			if (daylistDate < now) {
				console.log('>>>>> past daylistDate, redirecting');
				window.location = '/daylistViewer';
			}
		}
	}
	*/

//	userData.user = document.getElementsByName('reqUser')[0].getAttribute('content');

	var headerStr = document.getElementsByName('reqHeaders')[0].getAttribute('content');
	var ipStr = document.getElementsByName('reqIP')[0].getAttribute('content');

	processHeaders(headerStr, ipStr, function() {

		displayUserData(function() {

			displayResults(function() {

				postAmble();

			});

		});
	});


	function postAmble() {
		var versionString = document.getElementsByName('releaseVersion')[0].getAttribute('content');
		var versionDate = document.getElementsByName('releaseDate')[0].getAttribute('content');

		console.log('>>>> release [%s] date [%s]', versionString, versionDate);

		populateVersionBar(versionString, versionDate);

		var endTime = new Date();
		console.log('>>>> page load: [%d] ms', (endTime - startTime));
	}

});


// Functions =============================================================

function processHeaders(headerStr, ipStr, callback) {
//	console.log('>>> processHeaders');

//	console.log('>>>> headerStr: %s', headerStr);
	var headerObj = JSON.parse(headerStr);

	var headers = {};

	headers.userAgent = headerObj["user-agent"];
	headers.secChUa = headerObj["sec-ch-ua"];
	headers.secChUaPlatform = headerObj["sec-ch-ua-platform"];
	headers.screenResolution = headerObj["screenResolution"];

//	console.log('>>>> headers: %s', JSON.stringify(headers));

	var userCookie = headerObj["cookie"].split('loopoolUser=')[1];

	//
	// update cache
	userData.user = userCookie;
	userData.ip = ipStr;
	userData.headers = headers;


	callback(null);
}


function displayUserData(callback) {
//	console.log('>>> displayUserData');

//	console.log('>>>> userData: %s', JSON.stringify(userData));

	//
	// build html content for userInfo
	var infoStr = '';

	var userStrings = [];
	userStrings = userData.user.split(";");
	var userStr = userStrings[0];
	infoStr += '<h2 style="text-align: center;">Welcome User ' + userStr + '<h2>';

	infoStr += '<table>';

	infoStr += '<tr>';
	infoStr += '<td>incomingIP</td>';
	infoStr += '<td>' + userData.ip + '</td>';
	infoStr += '</tr>';

	infoStr += '<tr>';
	infoStr += '<td>userAgent</td>';
	infoStr += '<td>' + userData.headers.userAgent + '</td>';
	infoStr += '</tr>';

	infoStr += '<tr>';
	infoStr += '<td>platform</td>';
	infoStr += '<td>' + userData.headers.secChUaPlatform + '</td>';
	infoStr += '</tr>';

	infoStr += '</table>';

	//
	// render
	$("#userInfo").html(infoStr);


	//
	// build content for userControls
	var controlStr = '';

	controlStr += '<h2 style="text-align: center;">Command Controls<h2>';

	controlStr += '<div id="userControlsButtonPad">';
	controlStr += '<button id="loadButton"></button>';
	controlStr += '</div>';

	controlStr += '<div id="userControlsValues">';

	controlStr += '<div id="intervalControl" class="userControlsValues">';
	controlStr += '<h3>Transaction interval (ms)</h3>';
	controlStr += '<input id="transRate" size=10 />';
	controlStr += '</div>';

	controlStr += '<div id="loadNameControl" class="userControlsValues">';
	controlStr += '<h3>Load name</h3>';
	controlStr += '<input id="loadName" size=15 />';
	controlStr += '</div>';

	controlStr += '</div>';

	//
	// render
	$("#userControls").html(controlStr);

	//
	// button handler
	$("#loadButton").on("click", handleLoadButton);

	//
	// ...and set initial states
	handleLoadButton(true);
	$("#transRate").val(loadInterval);

	callback(null);
}

function displayResults(callback) {
//	console.log('>>> displayResults');

//	console.log('>>>> transTimes: %s', JSON.stringify(transTimes));

	//
	// build html content for load metrics
	var infoStr = '';

	infoStr += '<h2 style="text-align: center;">Load Metrics<h2>';


	if (transTimes.totalTrans == 0) {
		infoStr += '<h3 style="text-align: center;">No load run to display</h3>';

	} else {

		infoStr += '<table style="margin: 0 auto; width: 50%;">';

		var latestStart = new Date(transTimes.latestLoadStart);
		infoStr += '<th colspan=2>For load run ' + loadName + '<br>started: ' + latestStart.toLocaleString() + '</th>';

		infoStr += '<tr>';
		infoStr += '<td>Total Transactions</td>';
		infoStr += '<td>' + transTimes.totalTrans + '</td>';
		infoStr += '</tr>';

		infoStr += '<tr>';
		infoStr += '<td>Latest round-trip (ms)</td>';
		infoStr += '<td>' + transTimes.latestTime + '</td>';
		infoStr += '</tr>';

		infoStr += '<tr>';
		infoStr += '<td>Average round-trip (ms)</td>';
		var avgTime = transTimes.totalTime / transTimes.totalTrans;
		infoStr += '<td>' + Math.round(avgTime) + '</td>';
		infoStr += '</tr>';

		infoStr += '</table>';

	}	

	//
	// render
	$("#loadMetrics").html(infoStr);


	callback(null);
}

function handleLoadButton(init) {
//	console.log('>>> handleLoadButton');
	var toggleTime = new Date();

	if (init !== undefined && init == true) {
		$("#loadButton").text("Start Loading");
		$("#loadButton").attr("style", "color: green;");
	
	} else {
		//
		// toggle state
		if (loadingState == false) {
			$("#loadButton").text("Stop Loading");
			$("#loadButton").attr("style", "color: red;");
		
			//
			// commence load generation
			loadInterval = $("#transRate").val();
			loadName = $("#loadName").val();
			loadTimer = setInterval(loadTransaction, loadInterval);

			loadingState = true;
			console.log('>>>> Load started: %s', toggleTime.toLocaleString());
		} else {
			$("#loadButton").text("Start Loading");
			$("#loadButton").attr("style", "color: green;");
		
			//
			// cease load generation
			clearInterval(loadTimer);
			loadName = '';
			$("#loadName").val(loadName);

			loadingState = false;
			console.log('>>>> Load stopped: %s', toggleTime.toLocaleString());
		}
	}
}

function loadTransaction() {
//	console.log('>>> loadTransaction');

	var transStart = new Date();

	var eventData = {};

	eventData.user = userData.user;
	eventData.incomingIP = userData.ip;
	eventData.userAgent = userData.headers.userAgent;
	eventData.secChUa = userData.headers.secChUa;
	eventData.secChUaPlatform = userData.headers.secChUaPlatform;

	eventData.loadName = loadName;

	//
	// call the back-end route with an Ajax POST
	$
	.ajax({
		type: 'POST',
		data: eventData,
		url: '/loopoolEvents/new',
		dataType: 'JSON'
	})
	.done(
		function (response) {
//					console.log('>>>>> ajax call returned: %s', JSON.stringify(response));

			//
			// update cache
			var transEnd = new Date();
			var transTime = transEnd - transStart;

			if (transTimes.totalTrans == 0) {
				transTimes.latestLoadStart = transStart;
			}

			transTimes.totalTrans++;
			transTimes.latestTime = transTime;
			transTimes.totalTime += transTime;
			console.log('>>>> loadTrans [%d]: %d ms / avg %d ms', transTimes.totalTrans, transTime, transTimes.totalTime/transTimes.totalTrans);

			//
			// update metrics display
			displayResults(function() {
				// no-op
			});
		});

}


function fetchObjectives(callback) {
	var aToken = authUser.accessToken._id;
//	console.log('>>> fetchObjectives: token [%s]', aToken);
	
	//
	// clear cache
	objectivesArray = [];

	//
	// implicit input
	var urlStr = '/objectives/user?at=' + aToken;

	$
	.ajax({
		type: 'GET',
		url: urlStr,
		dataType: 'JSON'
	})
	.done(
		function (docs) {
//			console.log('>>>> db returned [%d] objectives', docs.length);
	
			docs.forEach(function(nextDoc) {
				objectivesArray.push(nextDoc);
			});

//			console.log('>>> objective 1: %s', JSON.stringify(objectivesArray[0]));

			//
			// sort by rank
			objectivesArray.sort(function(a, b) {
				var aRank = parseInt(a.rank);
				var bRank = parseInt(b.rank);

				return (aRank - bRank);
			});

			callback();
	});
}

function populateTasks(callback) {
	var aToken = authUser.accessToken._id;
//	console.log('>>> populateTasks: token [%s]', aToken);

	//
	// clear cache
	taskArray = [];

	//
	// implicit input
	var urlStr = '/daylistTasks/user?at=' + aToken;

	$
	.ajax({
		type: 'GET',
		url: urlStr,
		dataType: 'JSON'
	})
	.done(
		function (docs) {
//			console.log('>>>> db returned [%d] tasks', docs.length);
	
			docs.forEach(function(nextDoc) {
				taskArray.push(nextDoc);
			});

			//
			// sort by targetDate, descending
			taskArray.sort(function (a, b) {
				var aDate = new Date(a.targetDate);
				var bDate = new Date(b.targetDate);

				return (aDate - bDate);
			});

			var taskIndex = 0;
			taskArray.forEach(function (nextTask) {
				/*
				console.log('>>>> nextTask [%d]: %s', taskIndex, JSON.stringify(nextTask));
				taskIndex++;
				*/
				
				//
				// fetch objective details
				var theObjective = null;
				objectivesArray.forEach(function (nextObj) {
					if (nextObj._id == nextTask.objectiveRef) {
						theObjective = nextObj;
					}
				});

				if (theObjective !== null) {
					nextTask.taskColor = theObjective.areaColor;
				} else {
					console.log('>>>> objective ref [%s] not found', nextTask.objectiveRef);

//					callback();

				}
			});

			callback();
	});
}

function populateDaylist(callback) {
	//
	// sort by targetDate, descending
	daylistArray.sort(function(a, b) {
		var aDate = new Date(a.targetDate);
		var bDate = new Date(b.targetDate);

		return aDate - bDate;
	});

	//
	// daylist is displayed day-at-a-time
	// default cache setting is today
	if (daylistDate == null) { 
		daylistDate = new Date();
	}

//	console.log('>>> populateDaylist: [%s]', daylistDate.toDateString());

	var displayArray = [];

	var today = new Date();
	var daylistIndex = 0;

	daylistArray.forEach(function(nextD) {
//		console.log('>>>>> nextD: %s', JSON.stringify(nextD));

		var nextDDate = new Date(nextD.targetDate);

		var nextDCompDate = null;
		if (nextD.completion !== undefined) {
			if (nextD.completion.taskCompleted == true) {
//				console.log('>>>>>> task shows a completion: [%s] on [%s]', nextD.itemName, nextD.completion.completionDate);
				nextDCompDate = new Date(nextD.completion.completionDate);

				if (nextDCompDate.toLocaleDateString() == today.toLocaleDateString()) {		
//					console.log('>>>>>> task shows a completion today: [%s]', nextD.itemName);
				}
			}	
		}

		var displayItem = false;

		if (nextDDate.toLocaleDateString() == daylistDate.toLocaleDateString()) {
			//
			// show items with target of today, including completed recurring items
//			console.log('>>>>> [%s]: target date today', nextD.itemName);

			displayItem = true;

			if (nextD.completedToday == true) {
//				console.log('>>>>> item [%s] shows completion today', nextD.itemName);

				//
				// don't display skipped items, per ticket #79
				if (nextD.skippedToday == true) {
					console.log('>>>>> item [%s] SKIPPED today, no display', nextD.itemName);
					displayItem = false;
				}
			}		

		} else if (nextDDate < daylistDate && nextD.recurrence == '' && nextD.completion.taskCompleted == false) {
			//
			// show past-due items today, but not projected into future
			if (daylistDate.toLocaleDateString() == today.toLocaleDateString()) {
//				console.log('>>>>> [%s]: past-due items [%s] displayed for today', nextD.itemName, nextDDate.toLocaleDateString());
				displayItem = true;
			}
		}

		if (displayItem == true) {
			var nextDispItem = nextD;
			nextDispItem.daylistIndex = daylistIndex;
			displayArray.push(nextDispItem);
		}

		daylistIndex++;
	});

//	console.log('>>>> [%d] displayed items', displayArray.length);


	//
	// group displayed items by time preference, if any
	var groupedArray = [];

	//
	// explicit times first, in order
	dayTimes.forEach(function(nextDT) {
		displayArray.forEach(function(nextDA) {
			if (nextDA.timePreference !== undefined && nextDA.timePreference == nextDT) {
				groupedArray.push(nextDA);
			}
		});
	});

	//
	// ...then unset times
	displayArray.forEach(function(nextDA) {
		if (nextDA.timePreference == undefined || nextDA.timePreference == '') {
			groupedArray.push(nextDA);
		}
	});	

	displayArray = groupedArray;


	//
	// build content
	var tableContent = '';

	//
	// hidden form div for compTask
	tableContent += '<div id="compTaskDiv" name="compTaskDiv" style="width: 100%; height: auto; padding: 20px; display: none;" />';

	//
	// table of daylistTasks
	tableContent += '<div id="taskTableDiv">';

	tableContent += '<table id="taskTable" name="taskTable">';
	tableContent += '<thead>';

	tableContent += '<tr><th colspan="3">';

	//
	// shared with gameplanViewer - de-dupe!
	tableContent += '<div id="navTabDiv" class="navTabDiv" style="width: 100%; display: flex; flex-direction: row; justify-content: space-between;">';

	tableContent += '<button id="compTaskButton" name="compTaskButton" class="daylistActionButton">x</button>';

	tableContent += '<div id="daylistTab" class="navTabs">';
	tableContent += '<a href="/daylistViewer">daylist</a>';
	tableContent += '</div>';

	tableContent += '<button id="addTaskButton" name="addTaskButton" class="daylistActionButton">+</button>';

	tableContent += '</div>' // navTabDiv

	tableContent += '</th></tr>';

	tableContent += '<tr><th colspan="3">';

	tableContent += '<div id="navArrowDiv" name="navArrowDiv">';

	tableContent += '<div id="todayNavArrowDiv"><a id="todayNavArrow"> \<\< </a></div>';
	tableContent += '<div id="leftNavArrowDiv"><a id="leftNavArrow"> \< </a></div>';
	tableContent += '<div id="daylistDate">' + daylistDate.toDateString() + '</div>';
	tableContent += '<div id="rightNavArrow"><a id="rightNavArrow"> \> </a></div>';
	tableContent += '<div id="nodateNavArrow"><a id="nodateNavArrow"> \>\> </a></div>';

	tableContent += '</div>';

	tableContent += '</th></tr>';
	tableContent += '</thead>';


	tableContent += '<tbody>';

	displayArray.forEach(function(nextItem) {
		//
		// build output
		var nextItemDate = new Date(nextItem.targetDate);

		var nextItemCompDate = null;
		if (nextItem.completion !== undefined && nextItem.completion.completionDate !== null) {
			nextItemCompDate = new Date(nextItem.completion.completionDate);
		}

	    if (nextItem.completedToday == true) {
			//
			// if item completed today, display in completed state - inactive, struck-through
//			console.log('>>>> displaying item completed today: [%s]', nextItem.itemName);
			tableContent += '<tr style="vertical-align: top; width: 500px; height: 75px; background-color: ' + nextItem.itemColor + ';">';
			
			//
			// not updatable
			tableContent += '<td>';
			tableContent += '<div name="itemControls" style="display: flex; flex-direction: column; justify-content: space-between; align-items: center; border: 1px dashed gray;">';
	
			tableContent += '<a name="itemDone">';
			tableContent += '<p class=itemControl>X</p>';
			tableContent += '</a>';
			tableContent += '</div>';
	
			tableContent += '</td>';
			
			//
			// line-through
			tableContent += '<td class=itemNameDone><i>';	
			tableContent += '<a href="/daylistViewer?task=' + nextItem.taskRef + '" style="text-decoration: none; color: white;">';

			tableContent += nextItem.itemName;
			tableContent += '</a></i>'; 


			tableContent += '</td>';

			tableContent += '<td class=itemDate>';

			var timePrefStr = '';
			if (nextItem.timePreference !== undefined) { timePrefStr = nextItem.timePreference; }
			tableContent += nextItemDate.toDateString() + '<br><small><i>' + timePrefStr + '</i></small>';
			tableContent += '</td>';
	
		} else {
			tableContent += '<tr style="vertical-align: top; width: 500px; height: 75px; background-color: ' + nextItem.itemColor + ';">';

			//
			// else display item, in active state	
			tableContent += '<td>';
	
			//
			// de-activate completions for future-dated items
			if (daylistDate.toLocaleDateString() > today.toLocaleDateString()) {
				tableContent += '<a name="itemDone">';
			} else {
				tableContent += '<a name="itemDone-' + nextItem.daylistIndex + '" class="itemDoneControl" daylistIndex="' + nextItem.daylistIndex + '">';
			}

			tableContent += '<div name="itemControls" style="display: flex; flex-direction: column; justify-content: space-between; align-items: center; border: 1px dashed gray;">';
			tableContent += '<p class=itemControl>X</p>';
			tableContent += '</div>';
			tableContent += '</a>';
	
			tableContent += '</td>';
	
			tableContent += '<td class=itemName><b>';

			var dateStr = daylistDate.toLocaleDateString();
			tableContent += '<a href="/daylistViewer?task=' + nextItem.taskRef + '&reqDate=' + dateStr + '" style="text-decoration: none; color: white">';
			
			tableContent += nextItem.itemName;
			tableContent += '</a></b>'; 


			var doneBoxStr = 'doneBox-' + nextItem.daylistIndex;
			tableContent += '<div id="' + doneBoxStr + '" name="' + doneBoxStr + '" style="background: white; color: blue; font: 14px Helvetica; width:; height; 150px; display: none;">';

			tableContent += '<h2>' + 'Task Completion:  ' + nextItem.itemName + '</h2>';

			//
			// realize task-done form
			// purposely reusing the taskField styles
			var compFormStr = '';

			//
			// build the name-root for this item, to index the field values
			var nameRoot = 'compForm-' + nextItem.daylistIndex;
			var notesFieldName = nameRoot + '-compNotesField';
			var taskPartialCompFieldName = nameRoot + '-compTaskPartialCompField';

			compFormStr = '<div id="completionPopup" name="completionPopup">';

			//
			// buttons to replace dialog functionality
			compFormStr += '<div id="compActions" style="display: flex; flex-direction: row; justify-content: space-evenly; font: 24px Helvetica; background: white;">';

			compFormStr += '<button id="compCancel" name="compCancel" class="editorCancelButton" daylistIndex="' + nextItem.daylistIndex + '">Cancel</button>';
			compFormStr += '<button id="compSkip" name="compSkip" class="editorActionButton" daylistIndex="' + nextItem.daylistIndex + '">Skip</button>';
			compFormStr += '<button id="compDone" name="compDone" class="editorActionButton" daylistIndex="' + nextItem.daylistIndex + '">Done</button>';

			compFormStr += '</div>'; // compActions

			compFormStr += '</div>'; // completionPopup

			//
			// input form
			compFormStr += '<form id="compForm" name="compForm">';

			compFormStr += '<div id="compTaskPartialCompFieldDiv" name="compTaskPartialCompFieldDiv" class="taskField">';
			compFormStr += '<label for="' + taskPartialCompFieldName + '">Partial completion?</label>';

			var doneSelection = '<select id="' + taskPartialCompFieldName + '" name="' + taskPartialCompFieldName + '" style="font: 16px Helvetica; height: 40px;">';
			doneSelection += '<option id="no" name="no" value="false">no</option>';
			doneSelection += '<option id="yes" name="yes" value="true">yes</option>';
			doneSelection += '</select>';
			compFormStr += doneSelection;

			compFormStr += '</div>';

			compFormStr += '<br>';

			compFormStr += '<div id="compNotesFieldDiv" name="compNotesFieldDiv" class="taskField">';
			compFormStr += '<label for="' + notesFieldName + '">Completion notes</label>';
			compFormStr += '<textarea rows=3 cols=40 id="' + notesFieldName + '" name="' + notesFieldName + '" class="taskFieldInput" />'
			compFormStr += '</div>';

			compFormStr += '</form>';

			tableContent += compFormStr;


			tableContent += '</div>';


			tableContent += '</td>';

			//
			// some tasks have no recurrence or targetDate -- more like a placeholder
			// display these distinctly, but sort them to the bottom
			if (nextItemDate.toLocaleDateString() == lastDate) {
				tableContent += '<td class=itemDate>-- no date set --</td>';
			} else {
				tableContent += '<td class=itemDate>';
				var timePrefStr = '';
				if (nextItem.timePreference !== undefined) { timePrefStr = nextItem.timePreference; }
				tableContent += nextItemDate.toDateString() + '<br><small><i>' + timePrefStr + '</i></small>';
				tableContent += '</td>';
			}
		
		}

		tableContent += '</tr>';

		daylistIndex++;
	});

	tableContent += '</tbody>';
	tableContent += '</table>';

	tableContent += '</div>';

	$('#taskTableSpan').html(tableContent);

	//
	// add button handlers
	$("button#compTaskButton").on('click', compTask);
	$("button#addTaskButton").on('click', addTask);

	$("#todayNavArrow").on('click', todayNavArrow);
	$("#leftNavArrow").on('click', leftNavArrow);
	$("#rightNavArrow").on('click', rightNavArrow);
	$("#nodateNavArrow").on('click', nodateNavArrow);

	//
	// completion dialog
	$(".itemDoneControl").on('click', function() {
		var daylistIndex = $(this).attr("daylistIndex");
		itemDone(daylistIndex);
	});

	$("button#compCancel").on('click', function() {
		var daylistIndex = $(this).attr("daylistIndex");
		cancelDoneBox(daylistIndex);
	});

	$("button#compDone").on('click', function() {
		console.log('>>>> compComplete handler');

		var daylistIndex = $(this).attr("daylistIndex");
		console.log('>>>>> daylistIndex: [%s]', daylistIndex);

		taskComplete(daylistIndex);
	});

	$("button#compSkip").on('click', function() {
		var daylistIndex = $(this).attr("daylistIndex");
		taskSkipped(daylistIndex);
	});

	//
	// highlight daylist tab on nav-bar
	$("#daylistTab").css('border', '5px solid gold');

	
	callback();
}

function populateDonelist(callback) {
//	console.log('>>> populateDonelist: [%s]', daylistDate.toDateString());

//	console.log('>>>> [%d] total donelist items', donelistArray.length);

	var displayArray = [];

	var today = new Date();
	donelistArray.forEach(function(nextD) {
//		console.log('>>>>> nextD: %s', JSON.stringify(nextD));

		var nextDDate = new Date(nextD.eventDate);

//		console.log('>>>> nextDDate: [%s]', nextDDate.toLocaleDateString());

		if (nextDDate.toLocaleDateString() == daylistDate.toLocaleDateString()) {

			//
			// include completions only, no skips
			if (nextD.eventType == 'completed') {
				displayArray.push(nextD);
			}
		}
	});

//	console.log('>>>> [%d] displayed items', displayArray.length);

	//
	// sort ascending by event timestamp
	displayArray.sort(function(a, b) {
		var aTS = new Date(a.eventTimestamp);
		var bTS = new Date(b.eventTimestamp);

		return (aTS - bTS);
	});

	//
	// build content
	var tableContent = '';

	tableContent += '<div id="taskTableDiv">';

	tableContent += '<table id="taskTable" name="taskTable">';
	tableContent += '<thead>';

	tableContent += '<tr><th colspan="3">';

	tableContent += '<div style="display: flex; flex-direction: row; justify-content: space-between;">';
	tableContent += '<p style="font: 28px Helvetica;"><b>Daylist History</b></p>';
	tableContent += '</div>';

	tableContent += '</th></tr>';

	tableContent += '<tr><th colspan="3">';

	tableContent += '<div id="navArrowHistDiv">';
	tableContent += '<div id="earliestNavArrowDiv"><a id="earliestNavArrow"> \<\< </a></div>';
	tableContent += '<div id="leftNavArrowDiv"><a id="leftNavArrow"> \< </a></div>';
	tableContent += '<div id="daylistDateDiv">' + daylistDate.toDateString() + '</div>';
	tableContent += '<div id="rightNavArrowDiv"><a id="rightNavArrow"> \> </a></div>';
	tableContent += '<div id="todayNavArrowDiv"><a id="todayNavArrow"> \>\> </a></div>';
	tableContent += '</div>';

	tableContent += '</th></tr>';

	tableContent += '</thead>';

	tableContent += '<tbody>';

	//
	// iterate display items
	if (displayArray.length > 0) {

		displayArray.forEach(function(nextItem) {
			//
			// build output
			tableContent += '<tr style="vertical-align: top; width: 500px; height: 75px; background-color: ' + nextItem.itemColor + ';">';
	
			//
			// not updatable
			tableContent += '<td class=itemControl></td>';
			
			//
			// no line-throughs here
			if (nextItem.eventType == 'skipped') {
				tableContent += '<td class=itemNameDone><i>';	
			} else {
				tableContent += '<td class=itemName><i>';	
			}
	
			tableContent += '<a id="doneListItem-' + nextItem.taskRef + '" class="doneListItem" taskRef="' + nextItem.taskRef + '">';		
			
			tableContent += nextItem.daylistTaskName;
			tableContent += '</a></i>';

			tableContent += '<br><br>';
			tableContent += nextItem.eventNote;

			tableContent += '</td>';

			var eTS = new Date(nextItem.eventTimestamp);
			tableContent += '<td class=itemDate>' + eTS.toLocaleTimeString() + '</td>';
	
			tableContent += '</tr>';
	
		});

	} else {
		//
		// no past data to display
		tableContent += '<tr style="vertical-align: top; width: 500px; height: 75px; background-color: black; color: gold;">';

		tableContent += '<td colspan="3" style="text-align: center; vertical-align: top; font: 22px Helvetica;"><b>NO completed tasks found for this date!</b></td>';
	}

	tableContent += '</tbody>';
	tableContent += '</table>';

	tableContent += '</div>';

	$('#taskTableSpan').html(tableContent);

	//
	// add handlers
	$("button#addTaskButton").on('click', addTask);

	$("#earliestNavArrow").on('click', earliestNavArrow);
	$("#leftNavArrow").on('click', leftNavArrow);
	$("#rightNavArrow").on('click', rightNavArrow);
	$("#todayNavArrow").on('click', todayNavArrow);

	$(".doneListItem").on('click', function() {
		var taskRef = $(this).attr('taskRef');
		clickDonelistItem(taskRef);
	});

	callback();
}


function todayNavArrow() {
//	console.log('>>> todayNavArrow');

	/*
	//
	// daylist defaults to today, so...
	// use the occasion to clear any query strings
	window.location = '/daylistViewer';
	*/
	daylistDate = new Date();
	refreshDaylistView(true);
}

function nodateNavArrow() {
//	console.log('>>> nodateNavArrow');

	//
	// reset daylistDate to latest date supported
	// this will display items with no targetDate or recurrence
	daylistDate = new Date(lastDate);

	refreshDaylistView(true);	
}

function earliestNavArrow() {
//	console.log('>>> earliestNavArrow');

	//
	// reset daylistDate to earliest history date found
	daylistDate = new Date(earliestHistDate);

	refreshDonelistView();	
}

	
function leftNavArrow() {
//	console.log('>>> leftNavArrow');

	//
	// decrement daylistDate
	if (daylistDate !== null) {

		daylistDate.setDate(daylistDate.getDate() - 1);

//		console.log('>>>> daylistDate now: [%s]', daylistDate.toDateString());

	} else {
		//
		// default to today
		daylistDate = new Date();
	}

	var today = new Date();
	if (daylistDate.toLocaleDateString() !== today.toLocaleDateString() && daylistDate < today) {
//		console.log('>>>>> eligible for donelist');

		refreshDonelistView();

	} else {
		refreshDaylistView(true);
	}
}

function rightNavArrow() {
//	console.log('>>> rightNavArrow');

	//
	// increment daylistDate
	if (daylistDate !== null) {

		daylistDate.setDate(daylistDate.getDate() + 1);

//		console.log('>>>> daylistDate now: [%s]', daylistDate.toDateString());

	} else {
		//
		// default to today
		daylistDate = new Date();
	}

	var today = new Date();
	if (daylistDate.toLocaleDateString() !== today.toLocaleDateString() && daylistDate < today) {
//		console.log('>>>>> eligible for donelist');

		refreshDonelistView();

	} else {
		refreshDaylistView(true);
	}
}

function itemDone(daylistIndex) {
//	console.log('>>> itemDone [%s]', daylistIndex);

	//
	// display the hidden form for this item
	var formId = '#doneBox-' + daylistIndex;

	$(formId).show();
}

function cancelDoneBox(daylistIndex) {
//	console.log('>>> cancelDoneBox: [%d]', daylistIndex);

	var cancelStr = '#doneBox-' + daylistIndex;
	$(cancelStr).hide();

}

//
// subfunctions
function taskComplete(daylistIndex) {
//	console.log('>>>> taskComplete: [%d]', daylistIndex);

	//
	// materialize item and task
	var theItem = daylistArray[daylistIndex]; 
//	console.log('>>>> theItem: %s', JSON.stringify(theItem));


	var theTask = {};
	taskArray.forEach(function(nextT) {
		if (nextT._id == theItem.taskRef) {
			theTask = nextT;
		}
	});

//	console.log('>>>> task: %s', JSON.stringify(theTask));

	if (theTask.targetDate !== '') {
//		console.log('>>>> targetDated task: [%s]', theTask.targetDate);

	} else {
//		console.log('>>>> recurring task: [%s]', theTask.recurrence);
	}

	//
	// build db request
	var inputVals = {};

	//
	// from context
	inputVals.daylistTaskId = theTask._id;
	inputVals.eventTimestamp = new Date();

	//
	// completions show on the date they happen, not on the original target
	var itemTargetDate = new Date();
	inputVals.eventDate = itemTargetDate.toLocaleDateString();

	inputVals.targetDate = theTask.targetDate;
	inputVals.recurrence = theTask.recurrence;

	// 
	// from input fields -- these need to call out the explicit form fields by name
	var nameRoot = '#compForm-' + daylistIndex;
	var notesFieldName = nameRoot + '-compNotesField';
	var taskPartialCompFieldName = nameRoot + '-compTaskPartialCompField';

	inputVals.eventNote = $(notesFieldName).val();
	inputVals.taskPartialComp = $(taskPartialCompFieldName).val();

	//
	// call route
	console.log('>>>> /daylistTasks/complete, inputVals: %s', JSON.stringify(inputVals));

	$
		.ajax({
			type: 'POST',
			data: inputVals,
			url: '/daylistTasks/complete',
			dataType: 'JSON'
		})
		.done(
			function (response) {
//					console.log('>>>>> ajax call returned: %s', JSON.stringify(response));

				//
				// refresh view -- no change to daylistDate
				refreshDaylistView(true);
			});

}


function taskSkipped(daylistIndex) {
	console.log('>>>> taskSkipped: [%d]', daylistIndex);

	//
	// materialize item and task
	var theItem = daylistArray[daylistIndex]; 
//	console.log('>>>> theItem: %s', JSON.stringify(theItem));


	var theTask = {};
	taskArray.forEach(function(nextT) {
		if (nextT._id == theItem.taskRef) {
			theTask = nextT;
		}
	});

//	console.log('>>>> task: %s', JSON.stringify(theTask));

	if (theTask.targetDate !== '') {
//		console.log('>>>> targetDated task: [%s]', theTask.targetDate);

	} else {
//		console.log('>>>> recurring task: [%s]', theTask.recurrence);
	}

	//
	// build db request
	var inputVals = {};

	//
	// from context
	inputVals.daylistTaskId = theTask._id;
	inputVals.eventTimestamp = new Date();

	var itemTargetDate = new Date(theItem.targetDate);
	inputVals.eventDate = inputVals.eventTimestamp.toLocaleDateString();

	// 
	// ignore input

	//
	// call route
//	console.log('>>>> /daylistTasks/skip, inputVals: %s', JSON.stringify(inputVals));
	$
		.ajax({
			type: 'POST',
			data: inputVals,
			url: '/daylistTasks/skip',
			dataType: 'JSON'
		})
		.done(
			function (response) {
//					console.log('>>>>> ajax call returned: %s', JSON.stringify(response));

				refreshDaylistView(true);
			});
			
}



function compTask() {
//	console.log('>>> compTask');

	//
	// hide daylist
	$("#taskTableDiv").hide();

	//
	// build a generic version of task-done dialog from populateDaylist

	//
	// build selection list for tasks

	//
	// sort by name, alpha descending
	taskArray.sort(function(a, b) {

		//
		// ignore capitalization
		var aName = a.daylistTaskName.toLowerCase();
		var bName = b.daylistTaskName.toLowerCase();

		if (aName < bName) { return -1; }
		else if (aName > bName) { return 1; }
		else { return 0; }
	});
	
	//
	// build content
	var taskSelect = '<select id="taskSelectionField" name="taskSelectionField" class="taskFieldSelect">';

	//
	// add default option
	taskSelect += '<option id="none" name="none" value="">Select a task</option>';

	var taskIndex = 0;
	var tasksAdded = [];
	taskArray.forEach(function(nextTask) {
//		console.log('>>>>> nextTask: [%s]: %s', nextTask.daylistTaskName, nextTask.daylistTaskStatus);

		//
		// de-dupe the list somewhat
		var alreadyAdded = false;
		tasksAdded.forEach(function(nextT) {
			if (nextT == nextTask.daylistTaskName) {
				alreadyAdded = true;
			}
		});

		//
		// add only active, scheduled tasks
		if (alreadyAdded == false && nextTask.daylistTaskStatus == 'active' && nextTask.targetDate !== lastDate) {
			taskSelect += '<option id="' + nextTask.daylistTaskName + '" name="' + nextTask.daylistTaskName + '" value="' + taskIndex + '">';
//			taskSelect += ' style="background-color: ' + nextTask.taskColor + '; color: lightgray;">';
			taskSelect += nextTask.daylistTaskName + '</option>';

			tasksAdded.push(nextTask.daylistTaskName);
		}

		taskIndex++;
	});

//	console.log('>>>>> added [%d] tasks to list', tasksAdded.length);

	taskSelect += '</select>';

	//
	// build date-picker
	var dateSelect = '<select id="taskDateField" name="taskDateField" class="taskFieldSelect">';

	//
	// no default option -- these items must have dates associated

	//
	// add a selection for every date from the earliest historical task date up until today
	// i.e. no pre-dated completions
	var nextDate = new Date(earliestHistDate);
	var today = new Date();

	while (nextDate <= today) {
		var shortDateStr = nextDate.toDateString();
		shortDateStr = shortDateStr.substring(0, 10);

		var dateSelectStr = '';

		//
		// pre-select today
		if (nextDate.toLocaleDateString() == today.toLocaleDateString()) { 
			shortDateStr = '-- ' + shortDateStr + ' --'; 
			dateSelectStr = '<option id="' + nextDate.toLocaleDateString() + '" value="' + nextDate.toLocaleDateString() + '" selected>' + shortDateStr + '</option>';

		} else {
			dateSelectStr = '<option id="' + nextDate.toLocaleDateString() + '" value="' + nextDate.toLocaleDateString() + '">' + shortDateStr + '</option>';
		}

		dateSelect += dateSelectStr;

		nextDate.setDate(nextDate.getDate() + 1);
	}

	dateSelect += '</select>';


	//
	// build form content
	var formContent = '';

	formContent += '<div id="taskCompTitle" class="taskFormTitle">Task Completion</div>';

	//
	// conscious reuse of add-task styles
	formContent += '<form id="taskForm" name="taskForm">';


	formContent += '<div id="taskSelectionFieldDiv" name="taskSelectionFieldDiv" class="taskField">';
	formContent += '<label for="taskSelectionField">Task completed</label>';
	formContent += taskSelect;
	formContent += '</div>';

	formContent += '<br>';

	formContent += '<div id="taskDateFieldDiv" name="taskDateFieldDiv" class="taskField">';
	formContent += '<label for="taskDateField">Target date<br></label>';
	formContent += dateSelect;
	formContent += '</div>';

	formContent += '<br>';

	formContent += '<div id="taskPartialCompFieldDiv" name="taskPartialCompFieldDiv" class="taskField">';
	formContent += '<label for="taskPartialCompField">Partial completion?</label>';

	var doneSelection = '<select id="taskPartialCompField" name="taskPartialCompField" class="taskFieldSelect">';
	doneSelection += '<option id="no" name="no" value="false">no</option>';
	doneSelection += '<option id="yes" name="yes" value="true">yes</option>';
	doneSelection += '</select>';
	formContent += doneSelection;
	formContent += '</div>';

	formContent += '<br>';

	formContent += '<div id="taskNotesFieldDiv" name="taskNotesFieldDiv" class="taskField">';
	formContent += '<label for="taskNotesField">Completion notes</label>';
	formContent += '<textarea rows=3 cols=40 id="taskNotesField" name="taskNotesField" class="taskFieldInput" />'
	formContent += '</div>';

	formContent += '</form>';

	//
	// button bar - cancel, done (no skip)
	formContent += '<div id="retroActions" style="width: 730px; padding-left: 10px; display: flex; flex-direction: row; justify-content: space-evenly; font: 24px Helvetica; background: white;">';
	formContent += '<button id="retroCancel" name="retroCancel" class="editorCancelButton">Cancel</button>';
	formContent += '<div id="retroShiv" style="font: 18px Helvetica; width: 80px;"></div>'
	formContent += '<button id="retroDone" name="retroDone" class="editorActionButton">Done</button>';
	formContent += '</div>';

	
	$("#compTaskDiv").html(formContent);

	//
	// expose built-in form under button
	$("#compTaskDiv").show();

	//
	// button handlers
	$("#retroCancel").on('click', taskRetroCancel);
	$("#retroDone").on('click', taskRetroCompleted);
}

//
// done button: calls /task/complete route
function taskRetroCompleted() {
//	console.log('>>> taskRetroCompleted');

	//
	// get selected task value
	var selectedTaskIndex = $("#taskSelectionField").val();
	var theTask = taskArray[selectedTaskIndex];

//	console.log('>>>> selectedTask: [%d] %s', selectedTaskIndex, theTask.daylistTaskName);
//	console.log('>>>> task: %s', JSON.stringify(theTask));

	//
	// build db request
	var inputVals = {};

	//
	// from context
	inputVals.daylistTaskId = theTask._id;
	inputVals.eventTimestamp = new Date();

	//
	// these completions show on the target date
	var selectedTargetDate = $("#taskDateField").val();
	var targetDateObj = new Date(selectedTargetDate);
	inputVals.eventDate = targetDateObj.toLocaleDateString();
	inputVals.targetDate = targetDateObj.toLocaleDateString();

	//
	// honor the task recurrence if any (don't mark inactive)
	inputVals.recurrence = theTask.recurrence;

	// 
	// from input fields
	inputVals.eventNote = $("#taskNotesField").val();
	inputVals.taskPartialComp = $("#taskPartialCompField").val();

	console.log('>>>>> daylistTasks/complete inputVals: %s', JSON.stringify(inputVals));

	//
	// call route
	$
		.ajax({
			type: 'POST',
			data: inputVals,
			url: '/daylistTasks/complete',
			dataType: 'JSON'
		})
		.done(
			function (response) {
//					console.log('>>>>> ajax call returned: %s', JSON.stringify(response));

				//
				// refresh view
				refreshDaylistView(true);
			});

}

//
// cancel button
function taskRetroCancel() {
	console.log('>>> taskRetroCancel');

	/*
	//
	// re-hide
	$("#compTaskDiv").hide();
	*/
	refreshDaylistView(true);
}



function addTask() {
//	console.log('>>> addTask');

	//
	// hide daylist
	$("#taskTableDiv").hide();


	clickDaylistItem(null);
}

function clickDaylistItem(taskId) {

	if (taskId == undefined || taskId == null) {
//		console.log('>>> clickDaylistItem: taskId empty, adding new task');

		buildTaskDialog(null);

	} else {
//		console.log('>>> clickDaylistItem [%s]', taskId);

		//
		// fetch Task
		var theTask = null;
		taskArray.forEach(function(nextT) {
			if (nextT._id == taskId) {
				theTask = nextT;
			}
		});

		if (theTask !== null) {

//			console.log('>>>> Task: %s', JSON.stringify(theTask));

		} else {
			console.log('>>>> ERROR: Task [%s] not found', taskId);
		}

		buildTaskDialog(theTask);
	}
}

function clickDonelistItem(taskId) {

	if (taskId == undefined || taskId == null) {
		console.log('>>> clickDonelistItem: taskId empty, adding new task');

		buildTaskDialog(null);

	} else {
		console.log('>>> clickDonelistItem [%s]', taskId);

		//
		// fetch Task
		var theTask = null;
		taskArray.forEach(function(nextT) {
			if (nextT._id == taskId) {
				theTask = nextT;
			}
		});

		if (theTask !== null) {

//			console.log('>>>> Task: %s', JSON.stringify(theTask));

		} else {
			console.log('>>>> ERROR: Task [%s] not found', taskId);
		}

		buildTaskDialog(theTask);
	}
}

function buildTaskDialog(theTask) {
	//
	// define recurrence selection -- update with new options in generateDaylist
	var recurSelect = '';

	recurSelect = '<select id="taskRecurField" name="taskRecurField" class="taskFieldSelect" style="height: 40px;">';
	recurSelect += '<option id="none" name="none" value="">none</option>';
	recurSelect += '<option id="daily" name="daily" value="daily">daily</option>';
	recurSelect += '<option id="weekly" name="weekly" value="weekly">weekly</option>';
	recurSelect += '<option id="monthly" name="monthly" value="monthly">monthly</option>';
	recurSelect += '<option id="weekdays" name="weekdays" value="weekdays">weekdays</option>';
	recurSelect += '</select>';

	//
	// define time-of-day selections
	var todSelect = '';

	todSelect = '<select id="taskTimePrefField" name="taskTimePrefField" class="taskFieldSelect" style="height: 40px;">';
	todSelect += '<option id="none" name="none" value="">none</option>';

	dayTimes.forEach(function(nextDT) {
		todSelect += '<option id="' + nextDT + '" name="' + nextDT + '" value="' + nextDT +'">' + nextDT + '</option>';
	});

	todSelect += '</select>';

	//
	// build selection list for objectives
	var objectiveSelect = '<select id="taskObjectiveField" name="taskObjectiveField" class="taskFieldSelect">';

	//
	// add default option
	objectiveSelect += '<option id="none" name="none" style="background-color: white; color; gray;" value="">Select an objective</option>';

	//
	// then one per (active) objective
	objectivesArray.forEach(function(nextObj) {
		if (nextObj.objectiveStatus == 'active') {
			objectiveSelect += '<option id="' + nextObj.objectiveName + '" name="' + nextObj.objectiveName + '" value="' + nextObj._id + '"';
			objectiveSelect += ' style="background-color: ' + nextObj.areaColor + '; color: lightgray;">';
			objectiveSelect += nextObj.objectiveName + '</option>';
		}
	});
	objectiveSelect += '</select>';

	//
	// build date-picker
	var dateSelect = '<select id="taskDateField" name="taskDateField" class="taskFieldSelect">';

	//
	// add a selection for every date from the earliest historical task date out to the planning horizon
	var latestSelectDate = new Date();
	latestSelectDate = latestSelectDate.setDate(latestSelectDate.getDate() + planningHorizon);

	var nextDate = new Date(earliestHistDate);
	var today = new Date();

	while (nextDate <= latestSelectDate) {
		var shortDateStr = nextDate.toDateString();
		shortDateStr = shortDateStr.substring(0, 10);

		var dateSelectStr = '';

		//
		// pre-select today
		if (nextDate.toLocaleDateString() == today.toLocaleDateString()) { 
			shortDateStr = '-- ' + shortDateStr + ' --'; 
			dateSelectStr = '<option id="' + nextDate.toLocaleDateString() + '" value="' + nextDate.toLocaleDateString() + '" selected>' + shortDateStr + '</option>';

		} else {
			dateSelectStr = '<option id="' + nextDate.toLocaleDateString() + '" value="' + nextDate.toLocaleDateString() + '">' + shortDateStr + '</option>';
		}

		dateSelect += dateSelectStr;

		nextDate.setDate(nextDate.getDate() + 1);
	}

	//
	// add a no-date option
	var noDateDate = new Date(lastDate);
	dateSelect += '<option id="noDate" name="noDate" value="' + noDateDate.toLocaleDateString() + '">-- no date set --</option>';

	dateSelect += '</select>';

	//
	// task-type selection
	var typeSelect = '<select id="taskTypeField" name="taskTypeField" class="taskFieldSelect">';
	typeSelect += '<option id="none" value="">Select a task type</option>';
	typeSelect += '<option id="onetime" value="onetime">One-time</option>';
	typeSelect += '<option id="recurring" value="recurring">Recurring</option>';
	typeSelect += '</select>';

	//
	// weekly recurrence-day selection
	var recurDaySelect = '<select id="taskRecurDayField" name="taskRecurDayField" class="taskFieldSelect">';
	recurDaySelect += '<option id="none" value="">Select a day</option>';
	recurDaySelect += '<option id="Sunday" value="Su">Sunday</option>';
	recurDaySelect += '<option id="Monday" value="Mo">Monday</option>';
	recurDaySelect += '<option id="Tuesday" value="Tu">Tuesday</option>';
	recurDaySelect += '<option id="Wednesday" value="We">Wednesday</option>';
	recurDaySelect += '<option id="Thursday" value="Th">Thursday</option>';
	recurDaySelect += '<option id="Friday" value="Fr">Friday</option>';
	recurDaySelect += '<option id="Saturday" value="Sa">Saturday</option>';
	recurDaySelect += '</select>';

	//
	// monthly recurrence-week selection
	var recurWeekSelect = '<select id="taskRecurWeekField" name="taskRecurWeekField" class="taskFieldSelect">';
	recurWeekSelect += '<option id="none" value="">Select a week</option>';
	recurWeekSelect += '<option id="1" value="1">1st week</option>';
	recurWeekSelect += '<option id="2" value="2">2nd week</option>';
	recurWeekSelect += '<option id="3" value="">3rd week</option>';
	recurWeekSelect += '<option id="4" value="">4th week</option>';
	recurWeekSelect += '</select>';

	//
	// now build the page	
	constructDialog();

	//
	// if task provided, edit mode, else add mode
	if (theTask !== undefined && theTask !== null) {
//		console.log('>>> buildTaskDialog: theTask: [%s]', theTask.daylistTaskName);
//		console.log('>>> buildTaskDialog: theTask: %s', JSON.stringify(theTask));

		//
		// set input values
		$('#taskObjectiveField').val(theTask.objectiveRef);
		$('#taskRecurField').val(theTask.recurrence);
		$('#taskTimePrefField').val(theTask.timePreference);

		//
		// set hidden values
		$('input#taskId').val(theTask._id);
		$('input#taskColor').val(theTask.taskColor);

		//
		// for task type, force initial toggle set to mask unused fields correctly
		if (theTask.recurrence !== '') {
			$('#taskTypeField').val('recurring');
		} else {
			$('#taskTypeField').val('onetime');
		}
		toggleTaskType();

		//
		// recurrence set
		if (theTask.recurrence == 'weekly') {
//			console.log('>>>> task recurs weekly');

			//
			// grandfather bad data
			var recurDetails = theTask.recurrenceDetail;
			var recurDay = recurDetails.substr(0, 2);

			$('#taskRecurDayField').val(recurDay);

		} else if (theTask.recurrence == 'monthly') {
//			console.log('>>>> task recurs monthly');

			var recurDetails = theTask.recurrenceDetail;
			var recurDay = recurDetails.split(' ')[0];
			var recurWeek = recurDetails.split(' ')[1];

			$('#taskRecurDayField').val(recurDay);
			$('#taskRecurWeekField').val(recurWeek);

		} else {
			//
			// intentional no-op
//			$('#taskRecurDetailField').val(theTask.recurrenceDetail);
		}
		toggleTaskRecur();

		//
		// set contextual, read-only values
		$('input#taskIdField').val(theTask._id);
		$('input#taskIdField').attr('disabled', true);

		$('input#taskStatusField').val(theTask.daylistTaskStatus);
		$('input#taskStatusField').attr('disabled', true);

		//
		// set task values
		$('input#taskNameField').val(theTask.daylistTaskName);
		$('textarea#taskNotesField').val(theTask.taskNotes);

		//
		// set date selector

		//
		// grandfather date data
		var tDate = theTask.targetDate;
		if (tDate[0] == '0') { tDate = tDate.substring(1); }

//		console.log('>>>>> setting taskDateField to [%s]', tDate);
		$('select#taskDateField').val(tDate);

		//
		// build task-history table
		var tableContent = '';

		tableContent += '<br><br><hr style="width: 700px;">';

		tableContent += '<table id="taskHistoryTable">';
		tableContent += '<tr><th colspan=3 style="font: 20px Helvetica; color: goldenrod;">Task history</th></tr>';

		tableContent += '<tr style="font: 16px Helvetica; font-weight: 800; color: whitesmoke; background: goldenrod;">';
		tableContent += '<th>Event type</th>';
		tableContent += '<th>Date</th>';
		tableContent += '<th>Notes</th>';
		tableContent += '</tr>';


		if (theTask.taskHistoryArray !== undefined && theTask.taskHistoryArray.length > 0) {

			theTask.taskHistoryArray.sort(function(a, b) {
				var aDate = new Date(a.eventDate);
				var bDate = new Date(b.eventDate);

				return bDate - aDate;
			});

			theTask.taskHistoryArray.forEach(function(nextHist) {

				tableContent += '<tr style="text-align: center;">';

				tableContent += '<td style="font: 18px Helvetica; color: whitesmoke;">';
				tableContent += nextHist.eventType;			
				tableContent += '</td>';

				tableContent += '<td style="font: 18px Helvetica; color: whitesmoke;">';
				tableContent += nextHist.eventDate;			
				tableContent += '</td>';

				tableContent += '<td style="font: 18px Helvetica; color: whitesmoke;">';
				if (nextHist.eventNote !== undefined) {
					tableContent += nextHist.eventNote;			
				}
				tableContent += '</td>';
	
				tableContent += '</tr>';

			});

		} else {
			tableContent += '<tr><td colspan=3><p style="text-align: center;">NO HISTORY FOUND</p></td></tr>';
		}

		tableContent += '</table>';

		$('#taskHistorySpan').html(tableContent);


		dialogSetup(theTask);

	} else {
//		console.log('>>> buildTaskDialog: new Task');

		dialogSetup(null);
	}

	//
	// internal functions
	function constructDialog() {
//		console.log('>>>>> constructDialog');

		//
		// build form output
		var taskFormStr = '';

		taskFormStr = '<div id="taskPopup" name="taskPopup">';

		taskFormStr = '<div id="taskEditorTitle" class="taskFormTitle">Task Editor</div>';

		taskFormStr += '<form id="taskForm" name="taskForm">';

		//
		// hidden fields
		taskFormStr += '<input id="taskId" hidden />';
		taskFormStr += '<input id="taskColor" hidden />';

		//
		// inputs
		taskFormStr += '<div id="taskNameFieldDiv" name="taskNameFieldDiv" class="taskField">';
		taskFormStr += '<label for="taskNameField">Name</label>';
		taskFormStr += '<input id="taskNameField" name="taskNameField" size=30 class="taskFieldInput" />'
		taskFormStr += '</div>';

		taskFormStr += '<br>';

		taskFormStr += '<div id="taskObjectiveFieldDiv" name="taskObjectiveFieldDiv" class="taskField">';
		taskFormStr += '<label for="taskObjectiveField">Gameplan objective</label>';
		taskFormStr += objectiveSelect;
		taskFormStr += '</div>';

		taskFormStr += '<br>';
		
		taskFormStr += '<div id="taskNotesFieldDiv" name="taskNotesFieldDiv" class="taskField">';
		taskFormStr += '<label for="taskNotesField">Description</label>';
		taskFormStr += '<textarea rows=5 cols=21 id="taskNotesField" name="taskNotesField" class="taskFieldInput" />'
		taskFormStr += '</div>';

		taskFormStr += '<br>';



		//
		// toggle for task type - one-time vs recurring, with associated sub-fields
		taskFormStr += '<div id="taskTypeFieldDiv" name="taskTypeFieldDiv" class="taskField">';
		taskFormStr += '<label for="taskTypeField">Task type</label>';
		taskFormStr += typeSelect;
		taskFormStr += '</div>';

		taskFormStr += '<br>';	

		//
		// only some of these will be displayed - or none
		taskFormStr += '<div id="taskDateFieldDiv" name="taskDateFieldDiv" class="taskField">';
		taskFormStr += '<label for="taskDateField">Target completion date</label>';
		taskFormStr += dateSelect;
		taskFormStr += '</div>';

		taskFormStr += '<div id="taskRecurFieldDiv" name="taskRecurFieldDiv" class="taskField">';
		taskFormStr += '<label for="taskRecurField">Recurrence</label>';
		taskFormStr += recurSelect;
		taskFormStr += '</div>';

		taskFormStr += '<br>';
		
		taskFormStr += '<div id="taskRecurDetailFieldDiv" name="taskRecurDetailFieldDiv" class="taskField">';
		taskFormStr += '<label for="taskRecurDetailField">Recurrence Details</label>';
		taskFormStr += recurWeekSelect;
		taskFormStr += recurDaySelect;
//		taskFormStr += '<input id="taskRecurDetailField" name="taskRecurDetailField" class="taskFieldInput" style="height: 40px;" />'
		taskFormStr += '</div>';

		//
		// time-of-day for daylist
		taskFormStr += '<br>';
		
		taskFormStr += '<div id="taskTimePrefFieldDiv" name="taskTimePrefFieldDiv" class="taskField">';
		taskFormStr += '<label for="taskTimePrefField">Time of Day</label>';
		taskFormStr += todSelect;
		taskFormStr += '</div>';

		taskFormStr += '<br>';
		

		//
		// context fields -- read-only
		taskFormStr += '<br>';
		
		taskFormStr += '<div id="taskIdFieldDiv" name="taskIdFieldDiv" class="taskField">';
		taskFormStr += '<label for="taskIdField">ID</label>';
		taskFormStr += '<input id="taskIdField" name="taskIdField" class="taskFieldInput" readonly />';
		taskFormStr += '</div>';

		taskFormStr += '<div id="taskStatusFieldDiv" name="taskStatusFieldDiv" class="taskField">';
		taskFormStr += '<label for="taskStatusField">Status</label>';
		taskFormStr += '<input id="taskStatusField" name="taskStatusField" class="taskFieldInput" readonly />';
		taskFormStr += '</div>';

		taskFormStr += '</form>';

		taskFormStr += '<br>';
		taskFormStr += '<span id="taskActionSpan" />';

		taskFormStr += '<span id="taskHistorySpan" />';


		taskFormStr += '</div>'; // taskPopup

		//
		// now written to commandeer the daylistPane, vs. a pop-up
		$('#taskPopup').html(taskFormStr);

		//
		// ensure it's displayed
		$('#taskPopup').show();

		//
		// and force the page top
		$(window).scrollTop(0);
	}

	function dialogSetup(theTask) {

		var taskActionStr = '<div id="taskActions" style="padding-left: 10px; display: flex; flex-direction: row; justify-content: space-evenly; font: 24px Helvetica;">';

		taskActionStr += '<button id="taskCancel" name="taskCancel" class="editorCancelButton">Cancel</button>';
		taskActionStr += '<div id="cancelShiv" style="font: 18px Helvetica; width: 80px;"></div>'

		if (theTask == null) {
			taskActionStr += '<button id="taskModify" name="taskModify" class="editorActionButton">Add</button>';
		} else {

			//
			// check status of related objective
			var theRelatedObj = null;
			objectivesArray.forEach(function(nextO) {
				if (nextO._id == theTask.objectiveRef) {
					theRelatedObj = nextO;
				}
			});

			if (theTask.daylistTaskStatus !== 'active') {
				if (theRelatedObj !== null && theRelatedObj.objectiveStatus == 'active') {
					console.log('>>>>> related objective is inactive');
					taskActionStr += '<button id="taskActivate" name="taskActivate" class="editorActionButton">Activate</button>';
				}
			} else {
				taskActionStr += '<button id="taskModify" name="taskModify" class="editorActionButton">Modify</button>';
				taskActionStr += '<div id="buttonShiv1" style="font: 18px Helvetica; width: 15px;"></div>';
				taskActionStr += '<button id="taskClose" name="taskClose" class="editorActionButton">Close</button>';
			}	

			taskActionStr += '<div id="buttonShiv2" style="font: 18px Helvetica; width: 15px;"></div>';
			taskActionStr += '<button id="taskDelete" name="taskDelete" class="editorActionButton">Delete</button>';
		}

		$('#taskActionSpan').html(taskActionStr);

		//
		// set up click handlers for the buttons
		$("#taskCancel").on('click', cancelTaskDialog);
		$("#taskClose").on('click', closeTask);
		$("#taskDelete").on('click', delTask);
		$("#taskModify").on('click', modTask);
		$("#taskActivate").on('click', activateTask);

		//
		// establish form toggles, and prime the pump
		$("#taskTypeField").on('change', toggleTaskType);
		toggleTaskType();

		$("#taskRecurField").on('change', toggleTaskRecur);
		toggleTaskRecur();
	}
}


function toggleTaskRecur() {
//	console.log(">>> toggleTaskRecur");

	taskRecurToggle = $("#taskRecurField").val();

//	console.log('>>>> taskRecurToggle is now [%s]', taskRecurToggle);

	if (taskRecurToggle == 'daily' || taskRecurToggle == 'weekdays') {
//		console.log('>>>> no details');

		$('#taskRecurDetailFieldDiv').hide();

	} else if (taskRecurToggle == 'weekly') {
//		console.log('>>>> weekly details');

		$('#taskRecurDetailFieldDiv').show();
		$('select#taskRecurWeekField').hide();

	} else if (taskRecurToggle == 'monthly') {
//		console.log('>>>> monthly details');

		$('#taskRecurDetailFieldDiv').show();
		$('select#taskRecurWeekField').show();

	} else {
//		console.log('>>>> no selection, hide details');

		$('#taskRecurDetailFieldDiv').hide();
	}
}


function toggleTaskType() {
//	console.log(">>> toggleTaskType");

	taskTypeToggle = $("#taskTypeField").val();

//	console.log('>>>> taskTypeToggle is now [%s]', taskTypeToggle);

	//
	// hide the other task type, or both in the event of no value
	if (taskTypeToggle == 'onetime') {
		$('#taskRecurFieldDiv').hide();
		$('#taskRecurDetailFieldDiv').hide();

		$('#taskDateFieldDiv').show();

	} else if (taskTypeToggle == 'recurring') {
		$('#taskDateFieldDiv').hide();

		$('#taskRecurFieldDiv').show();

	} else {
		$('#taskRecurFieldDiv').hide();
		$('#taskRecurDetailFieldDiv').hide();
		$('#taskDateFieldDiv').hide();
	}
}


function cancelTaskDialog() {

	//
	// have to clear the entry URL
	// also, respects current daylistDate setting - cleaner UI
	refreshDaylistView(false);
}

function modTask() {
//	console.log('>>>> modTask');

	var inputVals = {};

	//
	// pull session values
	inputVals.authUserId = authUser.authUserId;
	//
	// this defaults for now
	inputVals.daylistTaskStatus = 'active';

	//
	// pull values from inputs
	inputVals._id = $('#taskId').val();
	inputVals.taskColor = $('#taskColor').val();
	inputVals.daylistTaskName = $('#taskNameField').val();
	inputVals.objectiveRef = $('#taskObjectiveField').val();
	inputVals.taskNotes = $('#taskNotesField').val();
	inputVals.targetDate = $('#taskDateField').val();
	inputVals.timePreference = $('#taskTimePrefField').val();
	inputVals.recurrence = $('#taskRecurField').val();

	//
	// represent recurrence details as a single string
	// this effectively grandfathers a LOT of old data
	var recurDetail = '';
	if (inputVals.recurrence !== '') {
		//
		// clear targetDate if recurrence set
		inputVals.targetDate = '';

		if (inputVals.recurrence == 'weekly') {
			recurDetail += $('#taskRecurDayField').val();
	
		} else if (inputVals.recurrence == 'monthly') {
			recurDetail += $('#taskRecurDayField').val();
			recurDetail += ' ' + $('#taskRecurWeekField').val();

		}
	}
	inputVals.recurrenceDetail = recurDetail;


	console.log('>>>> inputVals: %s', JSON.stringify(inputVals));


	//
	// subject to edits...


	//
	// detect new-task condition
	var newTask = false;
	if (inputVals._id == '') {
		console.log('>>>>> new task add');

		newTask = true;

		//
		// set color from selected objective
		var theObj = null;
		objectivesArray.forEach(function(nextObj) {
			if (nextObj._id == inputVals.objectiveRef) {
				theObj = nextObj;
				inputVals.taskColor = nextObj.areaColor;
			}
		});

		/*
		areasArray.forEach(function(nextA) {
			if (nextA._id == theObj.areaRef) {
				inputVals.taskColor = nextA.areaColor;
			}
		});
		*/
	}

	//
	// subject to edits...
	var editsPassed = true;

	//
	// call routes
	if (newTask == true) {

		//
		// call add route
		console.log('>>>> /daylistTasks/add');

		$
			.ajax({
				type: 'POST',
				data: inputVals,
				url: '/daylistTasks/add',
				dataType: 'JSON'
			})
			.done(
				function (response) {
//					console.log('>>>>> ajax call returned: %s', JSON.stringify(response));

					//
					// refresh view -- respect current daylistDate setting
					refreshDaylistView(false);
				});

	} else {
		console.log('>>>> /daylistTasks/modify');

		$
			.ajax({
				type: 'POST',
				data: inputVals,
				url: '/daylistTasks/modify',
				dataType: 'JSON'
			})
			.done(
				function (response) {
//					console.log('>>>>> ajax call returned: %s', JSON.stringify(response));

					//
					// refresh view -- respect current daylistDate setting
					refreshDaylistView(false);
				});
	}
}

function delTask() {
//		console.log('>>>> delTask');

	var del_ok = confirm('Delete this task?');

	if (del_ok == true) {
//			console.log('>>>> deleting task');
	
		//
		// pull values from inputs
		var inputVals = {};

		//
		// hidden/environment values
		inputVals.daylistTask = $('#taskId').val();

		//
		// request deletion
		$
			.ajax({
				type: 'POST',
				data: inputVals,
				url: '/daylistTasks/delete',
				dataType: 'JSON'
			})
			.done(
				function (response) {
//					console.log('>>>>> ajax call returned: %s', JSON.stringify(response));

					//
					// refresh view -- respect current daylistDate setting
					refreshDaylistView(false);

			});
	}

}

function closeTask() {
	console.log('>>>> closeTask');

	var comp_ok = confirm('Close out this task?');

	if (comp_ok == true) {
		console.log('>>>> closing task');
	
		//
		// pull values from inputs
		var inputVals = {};

		//
		// hidden/environment values
		inputVals.daylistTask = $('#taskId').val();

		//
		// request task completion
		$
			.ajax({
				type: 'POST',
				data: inputVals,
				url: '/daylistTasks/close',
				dataType: 'JSON'
			})
			.done(
				function (response) {
//					console.log('>>>>> ajax call returned: %s', JSON.stringify(response));

					//
					// refresh view -- respect current daylistDate setting
					refreshDaylistView(false);

			});
	}

}


function activateTask() {
	console.log('>>>> activateTask');

	var comp_ok = confirm('Re-activate this task?');

	if (comp_ok == true) {
		console.log('>>>> activating task');
	
		//
		// pull values from inputs
		var inputVals = {};

		//
		// hidden/environment values
		inputVals.daylistTask = $('#taskId').val();

		//
		// request task completion
		$
			.ajax({
				type: 'POST',
				data: inputVals,
				url: '/daylistTasks/activate',
				dataType: 'JSON'
			})
			.done(
				function (response) {
//					console.log('>>>>> ajax call returned: %s', JSON.stringify(response));

					//
					// refresh view -- respect current daylistDate setting
					refreshDaylistView(false);

			});

	}
}

	
	
function refreshDaylistView(domRefresh) {
//	console.log('>>> refreshDaylistView: domRefresh [%s]', domRefresh);

	//
	// remove task popup, if displayed
	$('#taskPopup').hide();

	//
	// refresh as cleanly as possible, driven by use-case
	// i.e. task editor has to redirect to clean up entry URL

	if (domRefresh == true) {
//		console.log('>>>> refreshing DOM');

		generateDaylist(function(err) {

			if (err == false) {
				console.log('>>>>> generateDaylist failed, retrying...');

				who(function() {
					generateDaylist(function(err) {
						populateDaylist(function() {

						});	
					});
				});

			} else {
				populateDaylist(function() {

				});
			}
		});

	} else {
//		console.log('>>>> redirecting');

		var dateParm = daylistDate.toLocaleDateString();
		var locationStr = '/daylistViewer?reqDate=' + dateParm;
	
		window.location = locationStr;
	}
}

function refreshDonelistView() {
//	console.log('>>> refreshDonelistView');

	populateNavBar();
	
	who(function() {
		generateDonelist(function() {
			populateDonelist(function() {

			});
		});
	});
}
	

function generateDaylist(callback) {

	var aToken = authUser.accessToken._id;
//	console.log('>>> generateDaylist for token [%s] on [%d] tasks, horizon [%d] days', aToken, taskArray.length, planningHorizon);

	//
	// clear cache
	daylistArray = [];

	//
	// daylist is displayed day-at-a-time
	// default cache setting is today
	if (daylistDate == null) { 
		daylistDate = new Date();
	}

	//
	// implicit input
	var urlStr = '/daylistTasks/daylist?at=' + aToken + '&daylistDate=' + daylistDate.toLocaleDateString();

	$
	.ajax({	
		type: 'GET',
		url: urlStr,
		dataType: 'JSON'
	})
	.done(
		function (docs) {
//					console.log('>>>>> ajax call returned: %s', JSON.stringify(response));


			if (docs == undefined) {
//				console.log('>>>> db call failed, suspect token expiration');

				callback(false);

			} else {
//				console.log('>>>> db returned [%d] projected daylistTasks', docs.length);

				docs.forEach(function(nextDoc) {
					daylistArray.push(nextDoc);
				});
	
				//
				// now iterate to add colors
				daylistArray.forEach(function(nextDL) {
	
					taskArray.forEach(function(nextT) {
	
						if (nextDL.taskRef == nextT._id) {
							nextDL.itemColor = nextT.taskColor;
						}
					});
				});
	
				callback(true);
			}

	});

}


function generateDonelist(callback) {
	var aToken = authUser.accessToken._id;
//	console.log('>>> generateDonelist for token [%s] on [%d] tasks, horizon [%d] days', aToken, taskArray.length, planningHorizon);

	//
	// clear cache
	donelistArray = [];

	//
	// implicit input
	var urlStr = '/daylistTasks/donelist?at=' + aToken + '&daylistDate=' + daylistDate.toLocaleDateString();

	$
	.ajax({
		type: 'GET',
		url: urlStr,
		dataType: 'JSON'
	})
	.done(
		function (docs) {
//					console.log('>>>>> ajax call returned: %s', JSON.stringify(response));

//			console.log('>>>> db returned [%d] history events', docs.length);

			docs.forEach(function(nextDoc) {
				donelistArray.push(nextDoc);
			});

			//
			// now iterate to add colors
			donelistArray.forEach(function(nextDL) {

				taskArray.forEach(function(nextT) {

					if (nextDL.taskRef == nextT._id) {
						nextDL.itemColor = nextT.taskColor;
					}
				});
			});

			//
			// sort donelist inversely by eventDate
			donelistArray.sort(function(a, b) {
				var aDate = new Date(a.eventDate);
				var bDate = new Date(b.eventDate);

				return bDate - aDate;
			});

			// 
			// reset cache
			if (donelistArray.length > 0) {
				earliestHistDate = new Date(donelistArray[(donelistArray.length - 1)].eventDate);
	//			console.log('>>>>> earliestHistDate set: [%s]', earliestHistDate.toDateString());
			} else {
				console.log('>>>>> zero-length donelist, assume new user');
				earliestHistDate = new Date();
			}

			callback();
	});
}


function gK() {
//	console.log('>>> gK');
  
	var now = new Date();
	var nowDay = now.getMinutes();
  
	nowDay *= 255;
	nowDay += 12341234;
	nowDay *= 171717;
	nowDay = nowDay - 432123;
  
//	console.log('>>>> keyCode: [%d]', nowDay);
	return(nowDay);
}
  
function who(callback) {
//	console.log('>>> who');

	var inputVals = {};
	inputVals.k = gK();

		//
		// call add route
		$
			.ajax({
				type: 'POST',
				data: inputVals,
				url: '/users/who',
				dataType: 'JSON'
			})
			.done(
				function (response) {
//					console.log('>>>>> ajax call returned: %s', JSON.stringify(response));

					authUser.authUserId = response.authUserId;
					authUser.authUserName = response.authUserName;
					authUser.superUser = response.superUser;
					authUser.agent = response.agent;

					if (response.showAds !== undefined) {
						authUser.showAds = response.showAds;
					}

					authUser.accessToken = response.accessToken;
//					console.log('>>>> user access token: [%s]', authUser.accessToken._id);

//					console.log('>>> authUser: %s', JSON.stringify(authUser));

					callback();
				});

}


function populateAds(callback) {
//	console.log('>>> populateAds');

	var adInserts = [ 
		{ 'insertPoint' : 'bannerAd', 'background' : 'green', 'textColor' : 'white', 'text' : 'produce market' },
		{ 'insertPoint' : 'footerAd', 'background' : 'yellow', 'textColor' : 'black', 'text' : 'eat at joes' },
	];

	//
	// generate HTML for ad inserts
	adInserts.forEach(function(nextIns) {
		var spanId = '#' + nextIns.insertPoint + 'Span';
//		console.log('>>>>> spanId: [%s]', spanId);		

		var adInsertStr = '';
		adInsertStr += '<div id="' + nextIns.insertPoint + '" style="background: ' + nextIns.background + '; color: ' + nextIns.textColor + '; opacity: 75%; width: 728px; height: 90px;">';
		adInsertStr += '<p style="text-align: center; vertical-align: center; font: 36px Courier;">' + nextIns.text + '</p>';
		adInsertStr += '</div>';

		$(spanId).html(adInsertStr);
	});

	//
	// paying customers don't see ads
	if (authUser.showAds !== undefined && authUser.showAds == 'no') {
//		console.log('>>>> showAds: no for user [%s]', authUser.authUserName);

		$("#bannerAd").hide();
		$("#footerAd").hide();

	} else {

		var adDice = Math.floor(Math.random() * 10);
		//	console.log('>>>> adDice: [%f]', adDice);
		
		if (adDice == 0) {
			//
			// bad luck, see 'em both
			$("#bannerAd").show();
			$("#footerAd").show();
	
		} else if (adDice % 2 == 0) {
			$("#bannerAd").hide();
			$("#footerAd").show();
	
		} else {
			$("#bannerAd").show();
			$("#footerAd").hide();
		}
		

	}

	callback();
}



function populateNavBar() {
//	console.log('>>> populateNavBar')

	//
	// set up user login icon
	$('#userName').text(authUser.authUserName);

	if (authUser.superUser == 'true') {
		$('#userIconLink').attr('href', '/userManagement');
//		$('#userIconLink').attr('href', '/logout');
	} else {
//		$('#userIconLink').attr('href', '/');

		$('#userIconLink').on('click', logoffRequest);
	}

	if (authUser.agent !== undefined) {
		var agentName = authUser.agent.agentUserName;

		if (agentName !== undefined && agentName.length > 0) {
			var agentNameStr = '<br>on behalf of [ ' + agentName + ' ]';
			$('#agentName').html(agentNameStr);
		}
	}

	//
	// hamburger menu trigger
	$("#hamburger").on('click', toggleHamburgerMenu);
}

function toggleHamburgerMenu() {
	console.log('>>> toggleHamburgerMenu');


	if (hamburgerDisplayed == false) {

		if (hamburgerBuilt == false) {

			var hMenu = '<div id="hamburgerMenu">';

			hMenu += '<div id="daylistPanel" class="hamburgerMenuItem">';
			hMenu += '<a id="daylistLink" href="/daylistViewer">daylist</a>'
			hMenu += '</div>';
		
			hMenu += '<div id="gameplanPanel" class="hamburgerMenuItem">';
			hMenu += '<a id="gameplanLink" href="/gameplanViewer">gameplan</a>'
			hMenu += '</div>';
		
			hMenu += '<div id="retroPanel" class="hamburgerMenuItem">';
			hMenu += '<a id="retroLink" href="/retroViewer">retrospective</a>'
			hMenu += '</div>';
		
			hMenu += '<div id="timelinePanel" class="hamburgerMenuItem">';
			hMenu += '<a id="timelineLink" href="/timelineViewer">timelines</a>'
			hMenu += '</div>';
		
			hMenu += '<div id="countdownPanel" class="hamburgerMenuItem">';
			hMenu += '<a id="countdownLink" href="/countdownViewer">countdown</a>'
			hMenu += '</div>';

			hMenu += '</div>'; // navMenu
		
		
			hMenu += '</div>'; // hamburgerMenu
		
			$("#hamburgerMenu").html(hMenu);
	
			hamburgerBuilt = true;
		}
	
		//
		// highlight the hamburger
		$("#hamburger").css('border', '1px solid white');

		$("#hamburgerMenu").show();

		hamburgerDisplayed = true;

	} else {
		//
		// un-highlight the hamburger
		$("#hamburger").css('border', '');

		$("#hamburgerMenu").hide();

		hamburgerDisplayed = false;
	}
}

function logoffRequest() {
	console.log('>>> logoffRequest');

	var confirmation = confirm('Log out?');

	if (confirmation == true) {

		console.log('>>>> logging out...');

		window.location = '/logout';
	}
}

function populateVersionBar(relVersion, relDate) {

	var versionDiv = '<div id="versionBar" style="padding: 20px; color: gold">';
	
	versionDiv += '<h3>Release ' + relVersion + '</h3>';
	versionDiv += '<h4>(' + relDate + ')</h4>';
	versionDiv += '<small><i>' + copyrightString + '</i></small>';
	
	versionDiv += '</div>';
	
	$('#versionBar').html(versionDiv);
	
}
