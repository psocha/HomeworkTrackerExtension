chrome.runtime.onStartup.addListener(function() {
    chrome.storage.local.get('assignments', function(result) {
        globalAssignments = [];
        if ("assignments" in result) globalAssignments = result["assignments"];
        refreshBadge();
    });
});

function refreshBadge() {
    chrome.browserAction.setBadgeBackgroundColor({color: "#008800"});
    var numItems = globalAssignments.length;
    if (numItems > 0) {
        chrome.browserAction.setBadgeText({text: (globalAssignments.length).toString()});
    } else {
        chrome.browserAction.setBadgeText({text: ""});
    }
}
