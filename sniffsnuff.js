/**
 * Local print out utility.
 * @param {array} args Argument list to print out.
 * @param {object} args Argument list to print out.
 */
var out = function(args)
{
	chrome
		.devtools
		.inspectedWindow
		.eval('console.log("' + args + '")');
};


/**
 * Parses headers
 * @param {object} Request A Request object from chrome.devtools.network event
 */
var parseHeaders = function(Request, scope)
{
	headers = Request.response.headers;
	for (id in headers)
	{
		fnParseContent(headers[id], Request.request.url, 'Headers received');
	}

	headers = [];

	headers = Request.request.headers;
	for (id in headers)
	{
		fnParseContent(headers[id], Request.request.url, 'Headers sent');
	}
};


/**
 * Parses cookies
 * @param {object} Request A Request object from chrome.devtools.network event
 */
var parseCookies = function(Request, scope)
{
	cookies = Request.response.cookies;
	for (id in cookies)
	{
		fnParseContent(cookies[id], Request.request.url, 'Cookies received');
	}

	cookies = [];

	cookies = Request.request.cookies;
	for (id in cookies)
	{
		fnParseContent(cookies[id], Request.request.url, 'Cookies sent');
	}
};


// onRequestFinished
chrome.devtools.network.onRequestFinished.addListener(
	function(Request)
	{
		var cookies, headers;

		fnUpdateSearch();

		if (!Request || !search.active)
			return false;

		//console.debug(Request);

		if (options.monitorResponses)
		{
			Request.getContent(
				function(content)
				{
					fnParseContent(content, Request.request.url, 'Response body');
				}
			);
		}

		if (options.monitorRequests)
		{
			Request.getContent(
				function(content)
				{
					fnParseContent(content, Request.request.url, 'Request body');
				}
			);
		}

		// Parse cookies
		options.monitorCookies && parseCookies(Request);

		// Parse headers
		options.monitorHeaders && parseHeaders(Request);
	}
);


chrome.devtools.network.onNavigated.addListener(
	function(url)
	{
		console.debug("Navigating to " + url);
	}
);


/**
 * Parses the response body.
 * @param {string} content - Request or response context.
 * @param {string} uri - URL of the resource the response body comes from.
 * @param {string} context - Context in which a match has been found (e.g. cookies or headers).
 */
var fnParseContent = function(content, uri, context)
{
	console.debug(context);
	content && fnDoSearch(search.keyword, content, uri, context);
};


/**
 * Looks for keywords in the context provided.
 * @param {string} what - Needle.
 * @param {string} where - Haystack.
 * @param {string} uri - URL of the resource the response body comes from.
 * @param {string} context - Context in which a match has been found (e.g. cookies or headers).
 */
var fnDoSearch = function(what, where, uri, context)
{
	if (!(what && where))
		return false

	typeof where === "object" &&
		(where = JSON.stringify(where))

	console.debug("Looking for %s in %s", what.substr(0, 15), where.substr(0, 15));

	var tableResults = document.getElementById('tableResults');

	// Remove the status row
	var initCell = document.getElementById('initCell');
	initCell && initCell.remove();

	var results;
	var tr, td1, td2, td3, td4;
	var re = new RegExp(what, options.ignoreCase? 'gim' : 'gm');

	while (results = re.exec(where))
	{

		//console.debug(results);

		if (!results)
			return false

		var match = results[0];
		var index = parseInt(results['index'], 10);
		var input = results['input'];

		var location =
			input.substring(index - search.delta,
				index + match.length + search.delta);

		tr = document.createElement('tr');
		td1 = document.createElement('td');
		td2 = document.createElement('td');
		td3 = document.createElement('td');
		td4 = document.createElement('td');

		td3.innerHTML = fnWrapTag(match, 'code');
		td4.innerHTML = fnWrapTag(location, 'textarea', 'form-control');
		td1.innerText = context;
		td2.innerHTML = fnWrapTag(uri, 'a', 'resource-uri');

		tr.appendChild(td1);
		tr.appendChild(td2);
		tr.appendChild(td3);
		tr.appendChild(td4);

		tableResults.getElementsByTagName('tbody')[0].appendChild(tr);

		fnBindResourceURILinks();

		//@debug
		console.debug("Found " +
			match +
			" in " +
			location +
			" at " +
			uri);

	} // end while
};


/**
 * Adds a click event to resource links
 * to open them in a DevTools panel.
 */
var fnBindResourceURILinks = function()
{
	var i, elems =
		document.getElementsByClassName('resource-uri');

	for (i=0; i < elems.length; i++)
	{
		elems[i]
			.addEventListener('click', cbOpenResourceURI);
	}
};


var cbOpenResourceURI = function(event)
{
	var uri = event.toElement.href;
	event.preventDefault();
	chrome.devtools.panels.openResource(uri);
};


/**
 * Returns input wrapped in an XML tag.
 * @param {string} input - input to wrap.
 * @param {string} tag - tag to wrap with.
 * @param {string} className - class name(s) to add to the tag.
 * @return {string} Wrapped in tag input.
 */
var fnWrapTag = function(input, tag, className)
{
	tag && (tag = tag.toString());
	className && (className = className.toString());

	// Little monster here
	return '<' +
		   (tag === 'a' ? tag + ' href="' + input + '"' : tag)  +
		   (className ? ' class="' + className + '"' : '') +
		   '>' +
		   input +
		   '</' + tag + '>';
}


/**
 * Populates the search options through the
 * UI controls
 */
var fnUpdateSearch = function()
{

	options =
	{
		monitorRequests:
			document.getElementById('cboxMonitorRequests').checked || false,

		monitorResponses:
			document.getElementById('cboxMonitorResponses').checked || false,

		monitorHeaders:
			document.getElementById('cboxMonitorHeaders').checked || false,

		monitorCookies:
			document.getElementById('cboxMonitorCookies').checked || false,

		monitorURLs:
			document.getElementById('cboxMonitorURLs').checked || false,

		ignoreCase:
			document.getElementById('cboxIgnoreCase').checked || false
	};
};


var cbDocumentReady = function()
{
	console.clear();
	console.debug("SniffSnuff is loaded and ready");

	fnListenUIEvents();
	fnInitTheme();
};


/**
 * Initiates some of the Material theme components
 */
var fnInitTheme = function()
{
	$.material.init();
};


var fnListenUIEvents = function()
{
	var btnSearch = document.getElementById('btnSearch');
	var btnClearAll = document.getElementById('btnClearAll');

	btnSearch.addEventListener('click', cbBtnSearch);
	btnClearAll.addEventListener('click', cbBtnClearAll);
};


var cbBtnClearAll = function(event)
{
	var tblResults = document.getElementById('tableResults');
	var newtbody = document.createElement('tbody');
	var tbody = document.querySelectorAll('#tableResults tbody');
	tbody[0].remove();
	tblResults.appendChild(newtbody);
};


var cbBtnSearch = function(event)
{
	var searchKeyword = document.getElementById('searchKeyword');
	var tableResults = document.getElementById('tableResults');
	var statusText = document.getElementById('statusText');

	/* Set search options */
	fnUpdateSearch();

	//console.debug(event);
	event.preventDefault();

	if (search.active)
	{
		search.active = false;
		event.toElement.innerText = 'Search';
		event.toElement.className =
			event.toElement.className.replace(/ btn-danger/gm, '');

		statusText.innerText =
			'Idle. Hit "Search" to start listening.';
	}
	else
	{
		search.keyword = searchKeyword.value;

		statusText.innerText = 'Looking for "' +
			search.keyword +
			'". Listening in on traffic...';

		search.active = true;
		event.toElement.innerText = 'Stop';
		event.toElement.className += ' btn-danger';
	}
};


var options =
{
	monitorRequests: true,
	monitorResponses: true,
	monitorHeaders: true,
	monitorCookies: true,
	monitorURLs: true,
	ignoreCase: true
};


var search =
{
	keyword: document.getElementById('keyword'),

	active: false,

	/** How many bytes to grab when printing the match spot */
	delta: 20
};


document.addEventListener("DOMContentLoaded", cbDocumentReady);
//EOF