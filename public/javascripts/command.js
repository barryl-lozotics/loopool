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


function populateVersionBar(relVersion, relDate) {

	var versionDiv = '<div id="versionBar" style="padding: 20px; color: gold">';
	
	versionDiv += '<h3>Release ' + relVersion + '</h3>';
	versionDiv += '<h4>(' + relDate + ')</h4>';
	versionDiv += '<small><i>' + copyrightString + '</i></small>';
	
	versionDiv += '</div>';
	
	$('#versionBar').html(versionDiv);
	
}
