//
// loopool - query module
//

//
// constants
var thisLocation = '/query';
		
//
// cache
var userData = {};

var refreshTimer = {};
var refreshInterval = 5000;

var transTimes = {};
transTimes.totalTime = 0;
transTimes.totalTrans = 0;

var loadName = '';
var eventsArray = [];


//
// controls
var refreshState = false;


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
	console.log('>>> loopool query controller');

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

	//
	// render
	$("#userInfo").html(infoStr);


	//
	// build content for userControls
	var controlStr = '';

	controlStr += '<h2 style="text-align: center;">Query Controls<h2>';

	controlStr += '<div id="userControlsButtonPad">';
	controlStr += '<button id="refreshButton"></button>';
	controlStr += '</div>';

	controlStr += '<div id="userControlsValues">';
	controlStr += '<h3>Refresh interval (ms)</h3>';
	controlStr += '<input id="refreshRate" size=10 />'
	controlStr += '</div>';

	//
	// render
	$("#userControls").html(controlStr);

	//
	// button handler
	$("#refreshButton").on("click", handleRefreshButton);

	//
	// ...and set initial states
	handleRefreshButton(true);
	$("#refreshRate").val(refreshInterval);

	callback(null);
}

function displayResults(callback) {
//	console.log('>>> displayResults');

//	console.log('>>>> transTimes: %s', JSON.stringify(transTimes));

	//
	// build html content for load overview
	var infoStr = '';

	infoStr += '<h2 style="text-align: center;">Load Overview</h2>';

	if (eventsArray.length == 0) {
		infoStr += '<h3 style="text-align: center;">No load run to display</h3>';

	} else {

		infoStr += '<table style="margin: 0 auto; width: 50%;">';

		infoStr += '<thead>';

		infoStr += '<tr>';
		infoStr += '<th colspan=5>Total events: ' + eventsArray.length + '<br><br>';
		infoStr += 'Last 10 events' + '</th>';
		infoStr += '</tr>';

		infoStr += '<tr>';
		infoStr += '<th>Event time</th>';
		infoStr += '<th>User</th>';

		infoStr += '<th>Load name</th>';

		infoStr += '<th>IP Address</th>';
		infoStr += '<th>User agent</th>';
		infoStr += '</tr>';

		infoStr += '</thead>';


		infoStr += '<tbody>';
		
		//
		// latest 10 events
		for (var i = 0; i <= 10; i++) {
			var evObj = eventsArray[i];

			infoStr += '<tr>';

			infoStr += '<td>' + evObj.eventTimestamp + '</td>';
			infoStr += '<td>' + evObj.user + '</td>';

			infoStr += '<td>' + evObj.loadName + '</td>';

			infoStr += '<td>' + evObj.incomingIP + '</td>';
			infoStr += '<td>' + evObj.userAgent + '</td>';

			infoStr += '</tr>';
		}
		infoStr += '</tbody>';
		
		infoStr += '</table>';

	}	

	//
	// render
	$("#latestEvents").html(infoStr);


	callback(null);
}


function handleRefreshButton(init) {
//	console.log('>>> handleRefreshButton');
	var toggleTime = new Date();

	if (init !== undefined && init == true) {
		$("#refreshButton").text("Refresh");
		$("#refreshButton").attr("style", "color: green;");
	
	} else {
		//
		// toggle state
		if (refreshState == false) {
			$("#refreshButton").text("Stop Refresh");
			$("#refreshButton").attr("style", "color: red;");
		
			//
			// commence refresh cycle
			refreshInterval = $("#refreshRate").val();
			refreshTimer = setInterval(refreshTransaction, refreshInterval);

			refreshState = true;
			console.log('>>>> Refresh started: %s', toggleTime.toLocaleString());
		} else {
			$("#refreshButton").text("Refresh");
			$("#refreshButton").attr("style", "color: green;");
		
			//
			// cease refresh cycle
			clearInterval(refreshTimer);

			refreshState = false;
			console.log('>>>> Refresh stopped: %s', toggleTime.toLocaleString());
		}
	}
}

function refreshTransaction() {
//	console.log('>>> refreshTransaction');

	var transStart = new Date();


	//
	// implicit input
	var urlStr = '/loopoolEvents/summary';

	$
	.ajax({
		type: 'GET',
		url: urlStr,
		dataType: 'JSON'
	})
	.done(
		function (data) {
//			console.log('>>>> db returned [%d] objectives', docs.length);

//			console.log('>>>> db returned data: %s', JSON.stringify(data));

			//
			// refresh model in cache

			//
			// eventsArray
			eventsArray = [];

			data.eventsArray.forEach(function(nextE) {
				eventsArray.push(nextE);
			});

			console.log('>>>> [%d] model events', eventsArray.length);

			//
			// sort in inverse-time order
			eventsArray.sort(function(a, b) {
				var aDate = a.eventTimestamp;
				var bDate = b.eventTimestamp;

				if (aDate < bDate) {
					return 1;
				} else if (aDate > bDate) {
					return -1;
				} else {
					return 0;
				}
			});

//			console.log('>>>> latest event: %s', JSON.stringify(eventsArray[0]));

			//
			// loadName
			loadName = eventsArray[0].loadName;

			//
			// transTime object ?


			var transEnd = new Date();
			var transTime = transEnd - transStart;
			console.log('>>>> transTime: [%d] ms', transTime);

			//
			// update metrics display
			displayResults(function() {
				// no-op
			});
	});
}


function populateVersionBar(relVersion, relDate) {

	var versionDiv = '<div id="versionBar" style="padding: 20px; color: gold">';
	
	versionDiv += '<h3>Release ' + relVersion + '</h3>';
	versionDiv += '<h4>(' + relDate + ')</h4>';
	versionDiv += '<small><i>' + copyrightString + '</i></small>';
	
	versionDiv += '</div>';
	
	$('#versionBar').html(versionDiv);
	
}
