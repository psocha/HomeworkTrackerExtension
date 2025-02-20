var globalAssignments = [];
var globalSort = {field:"dueDate", topToBottom:true};

document.addEventListener('DOMContentLoaded', function() {

    chrome.storage.local.get('sort_preferences', function(result) {
        globalSort = {field:"dueDate", topToBottom:true};
        if ("sort_preferences" in result) globalSort = result["sort_preferences"];
    });

    chrome.storage.local.get('assignments', function(result) {
        globalAssignments = [];
        if ("assignments" in result) globalAssignments = result["assignments"];

        generateDisplay();

        var addDateTextBox = document.getElementById("add_date");
        var picker = new Pikaday({
            field: addDateTextBox
        });

        var sortableHeaders = document.getElementsByClassName("sortable");
        for (var i = 0; i < sortableHeaders.length; i++) {
            var header = sortableHeaders[i];
            header.addEventListener('mousedown', function(e){ e.preventDefault(); }, false);
            header.addEventListener("click", function() {
                var clickedField = "";
                var oldField = globalSort["field"];
                if (this.className.indexOf("subject") > -1) {
                    clickedField = "subject";
                } else if (this.className.indexOf("description") > -1) {
                    clickedField = "description";
                } else {
                    clickedField = "dueDate";
                }
                if (clickedField == oldField) {
                    globalSort["topToBottom"] = !globalSort["topToBottom"];
                } else {
                    globalSort["field"] = clickedField;
                    globalSort["topToBottom"] = true;
                }
                chrome.storage.local.set({"sort_preferences": globalSort}, function() {});
                refresh();
            });
        }
    });
});

function generateDisplay() {
    var table = document.getElementById("assn_table");

    for (var i = 0; i < globalAssignments.length; i++) {
        table.appendChild(rowForAssignment(globalAssignments[i]));
    }

    var descBox = document.getElementById("add_description");
    autoResize(descBox);
    descBox.addEventListener("keyup", function() { autoResize(descBox); });

    var add_btn = document.getElementById("add_btn");
    add_btn.addEventListener("click", function() {
        var subjectBox = document.getElementById("add_subject");
        var descriptionBox = document.getElementById("add_description");
        var dueDateBox = document.getElementById("add_date");

        var subject = subjectBox.value;
        var description = descriptionBox.value;
        var dueDate = dueDateBox.value;

        var errors = invalidInputs(subject, description, dueDate);

        subjectBox.className = "add_assn_subject";
        descriptionBox.className = "add_assn_description";
        dueDateBox.className = "datepicker";
        if (errors["subject"] == true) subjectBox.className = "input_error add_assn_subject";
        if (errors["description"] == true) descriptionBox.className = "input_error add_assn_description";
        if (errors["dueDate"] == true) dueDateBox.className = "input_error datepicker";
        if (!errors["subject"] && !errors["description"] && !errors["dueDate"]) {
            saveNewAssignment(subject, description, dueDate);
            subjectBox.value = "";
            descriptionBox.value = "";
            dueDateBox.value = "";
            autoResize(descriptionBox);
        }
    });

    refresh();
}

function invalidInputs(subject, description, dueDate) {
    var invalid = {subject:false, description:false, dueDate:false};
    if (description.length == 0) {
        invalid["description"] = true;
    }
    return invalid;
}

function rowForAssignment(assignment) {
    var subject = assignment["subject"];
    var desc = assignment["description"];
    var dueDate = assignment["dueDate"];

    var displayTemplate = document.querySelector("#template_assn_display");
    var row = document.importNode(displayTemplate.content, true);

    var subjectTextBox = row.querySelector(".assn_subject");
    subjectTextBox.value = subject;
    var descTextBox = row.querySelector(".assn_description");
    descTextBox.value = desc;
    var dueDateBox = row.querySelector(".datepicker");
    dueDateBox.value = dueDate;
    var picker = new Pikaday({
        field: dueDateBox
    });

    autoResize(descTextBox);
    descTextBox.addEventListener("keyup", function() { autoResize(descTextBox); });

    subjectTextBox.addEventListener("change", function() { updateRow(this);});
    descTextBox.addEventListener("change", function() { updateRow(this);});
    dueDateBox.addEventListener("change", function() { updateRow(this);});

    var doneButton = row.querySelector(".done_assn_btn");
    doneButton.addEventListener("click", function() {
        var tableRow = doneButton.parentNode.parentNode;

        var subjectToDelete = tableRow.querySelector(".assn_subject").value;
        var descriptionToDelete = tableRow.querySelector(".assn_description").value;
        var dateToDelete = tableRow.querySelector(".datepicker").value;
        var assignmentObj = {subject:subjectToDelete, description:descriptionToDelete, dueDate:dateToDelete};

        markAssignmentAsDone(assignmentObj, tableRow);
    });

    return row;
}

function updateRow(updatedBox) {
    var tableRow = updatedBox.parentNode.parentNode;

    var table = document.getElementById("assn_table");
    var rows = table.getElementsByTagName("tr");
    var rowIndex = -1;
    for (var i = 1; i < rows.length; i++) {
        if (rows[i] == tableRow) rowIndex = i;
    }
    if (rowIndex == -1) return;

    var subjectBox = tableRow.querySelector(".assn_subject");
    var descriptionBox = tableRow.querySelector(".assn_description");
    var dueDateBox = tableRow.querySelector(".datepicker");
    subjectBox.className = "assn_subject";
    descriptionBox.className = "assn_description";
    dueDateBox.className = "datepicker";

    var subjectToUpdate = subjectBox.value;
    var descriptionToUpdate = descriptionBox.value;
    var dateToUpdate = dueDateBox.value;

    var errors = invalidInputs(subjectToUpdate, descriptionToUpdate, dateToUpdate);
    if (errors["subject"] == true) subjectBox.className = "input_error assn_subject";
    if (errors["description"] == true) descriptionBox.className = "input_error assn_description";
    if (errors["dueDate"] == true) dueDateBox.className = "input_error datepicker";

    if (!errors["subject"] && !errors["description"] && !errors["dueDate"]) {
        globalAssignments[rowIndex - 1] = {
            subject: subjectToUpdate,
            description: descriptionToUpdate,
            dueDate: dateToUpdate
        };
        chrome.storage.local.set({"assignments": globalAssignments}, function() {});
        refresh();
    }
}

function saveNewAssignment(subject, description, dueDate) {
    var newAssnObj = {subject:subject, description:description, dueDate:dueDate};
    globalAssignments.push(newAssnObj);
    chrome.storage.local.set({"assignments": globalAssignments}, function() {});

    var table = document.getElementById("assn_table");
    table.appendChild(rowForAssignment(newAssnObj));

    refresh();
}

function markAssignmentAsDone(assignmentObj, tableRow) {
    var index = -1;
    for (var i = 0; i < globalAssignments.length; i++) {
        var arrayObj = globalAssignments[i];
        if (arrayObj["subject"] == assignmentObj["subject"] &&
            arrayObj["description"] == assignmentObj["description"] &&
            arrayObj["dueDate"] == assignmentObj["dueDate"]) {
            index = i;
            break;
        }
    }
    if (index >= 0) {
        globalAssignments.splice(index, 1);
        tableRow.parentNode.removeChild(tableRow);
        chrome.storage.local.set({"assignments": globalAssignments}, function() {});
        refresh();
    }
}

function refresh() {
    updateSortHeadings();
    sortDataSet();
    refreshTable();
    refreshBadge();
}

function updateSortHeadings() {
    var arrowSpans = document.getElementsByClassName("arrow");
    for (var i = 0; i < arrowSpans.length; i++) {
        arrowSpans[i].innerHTML = "";
    }

    var arrowSpanContents;
    if (globalSort["topToBottom"] == true) {
        arrowSpanContents = "&nbsp;&#x25BC;";
    } else {
        arrowSpanContents = "&nbsp;&#x25B2;";
    }

    var sortedSpan = document.getElementById("arrow_" + globalSort["field"]);
    if (sortedSpan) sortedSpan.innerHTML = arrowSpanContents;
}

function sortDataSet() {
    globalAssignments.sort(function(a, b) {
        var topToBottom = globalSort["topToBottom"];
        var field = globalSort["field"];
        if (field == "subject") {
            var diff = 0;
            if (a["subject"] > b["subject"]) diff = 1;
            if (a["subject"] < b["subject"]) diff = -1;
            if (!topToBottom) diff = -diff;
            return diff;
        } else if (field == "description") {
            var diff = 0;
            if (a["description"] > b["description"]) diff = 1;
            if (a["description"] < b["description"]) diff = -1;
            if (!topToBottom) diff = -diff;
            return diff;
        } else if (field == "dueDate") {
            var dateA = new Date(a["dueDate"]).getTime();
            var dateB = new Date(b["dueDate"]).getTime();
            if (isNaN(dateA)) dateA = Number.MAX_VALUE;
            if (isNaN(dateB)) dateB = Number.MAX_VALUE;
            var diff = dateA - dateB;
            if (!topToBottom) diff = -diff;
            return diff;
        }
    });
}

function refreshTable() {
    var table = document.getElementById("assn_table");
    var no_assns_div = document.getElementById("no_assns");
    if (globalAssignments.length == 0) {
        table.style.display = "none";
        no_assns_div.style.display = "block";
        return;
    }
    table.style.display = "table";
    no_assns_div.style.display = "none";
    var rows = table.getElementsByTagName("tr");
    for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        var subjectBox = row.querySelector(".assn_subject");
        var descriptionBox = row.querySelector(".assn_description");
        var dateBox = row.querySelector(".datepicker");

        subjectBox.value = globalAssignments[i - 1]["subject"];
        descriptionBox.value = globalAssignments[i - 1]["description"];
        dateBox.value = globalAssignments[i - 1]["dueDate"];

        autoResize(descriptionBox);
    }
}

function refreshBadge() {
    chrome.action.setBadgeBackgroundColor({color: "#008800"});
    var numItems = globalAssignments.length;
    if (numItems > 0) {
        chrome.action.setBadgeText({text: (globalAssignments.length).toString()});
    } else {
        chrome.action.setBadgeText({text: ""});
    }
}

function autoResize(textarea) {
    textarea.style.height = "20px";
    textarea.style.height = (textarea.scrollHeight - 5)+"px";
}
