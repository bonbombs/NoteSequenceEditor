// Editor Constants
let NOTES_PER_PAGE = 32;
const MAX_PAGES = 15;
const NOTE_WIDTH = 30;
const NOTE_HEIGHT = 30;
const MAX_CANVAS_SIZE = 20000;
const MAX_FILE_SIZE = 10; // MB
const MAX_BPM = 300;
const MAX_SONG_LEN = 30;

const LOG_LOG = 0;
const LOG_WARNING = 1;
const LOG_ERROR = 2;
const LOG_SUCCESS = 3;

// Note Editor canvas constants
const DEFAULT_NOTE_COLOR = "DarkGray";
const SELECTED_NOTE_COLOR = "DeepSkyBlue";
const LOG_COLOR = "White";
const WARNING_COLOR = "Goldenrod";
const ERROR_COLOR = "Red";
const SUCCESS_COLOR = "Green";

const EMPTY = 0;
const SIXTEENTH = 1;
const EIGHTH = 2;
const FOURTH = 4;

// Setting variables
let BPM = 124;
let SongLength = 30;        // in seconds
let Pages = [];
let CURRENT_PAGE = 0;

// Canvas variables
let canvas;
let Stage;
let isNoteDown = false;

let MessageLog;

let clipboard;

function init() {
    // Add util functions first
    polyfill();

    // Init Message Log
    MessageLog = $("#MessageLog");

    // Update UI with default values
    $("#input_BPMCount").val(BPM);
    $("#input_LengthPerPage").val(SongLength);
    NOTES_PER_PAGE = (BPM) * (SongLength / 60) * 4;
    NOTES_PER_PAGE = Math.ceil(NOTES_PER_PAGE);
    Pages[CURRENT_PAGE] = [];
    updateUI();

    // Check if we can use canvas...
    if(!(!!document.createElement("canvas").getContext))
    {
        var wrapper = document.getElementById("canvasWrapper");
        wrapper.innerHTML = "Your browser does not appear to support " +
        "the HTML5 Canvas element";
        return;
    }

    // Setup canvas
    var canvasContainer = document.getElementById("Editor");
    canvas = document.getElementById("InteractiveEditor");
    canvas.width = canvasContainer.clientWidth;
    canvas.height = canvasContainer.height;
    Stage = new createjs.Stage(canvas);
    Stage.enableMouseOver(5);

    // Setup context menu
    $.contextMenu({
        selector: '.pageButton',
        callback: handlePageContextClick,
        items: {
            "copy": { name: "Copy Notes"},
            "paste": { name: "Paste Notes"},
            "clear": { name: "Clear Page" },
            "delete": { name: "Delete Page"}
        }
    });

    // Set up note pages
    $("#AddPage").on("click", handleAddPage);
    var button = $("<div></div>").addClass("pageButton");
    button.text((1).toString());
    button.insertBefore("#AddPage");
    button.on("click", handlePageClick);
    button.addClass("active");
    
    // Draw the note editor in canvas
    populate();

    // Add handlers to buttons and user input listeners to UI
    $("#SaveJSON").click(saveJSON);
    $("#LoadJSON").click(function() {
        document.getElementById("uploadJSONFile").click();
    })
    $("#LoadMIDI").click(function(){
        document.getElementById("uploadMIDIFile").click();
    })
    $('#fileuploadJSON').fileupload({
        dataType: 'json',
        maxChunkSize: MAX_FILE_SIZE * 1000000, // 10 MB
        done: function(e, data) {
            loadJSON(e, data)
        }
    });
    $('#fileuploadMIDI').fileupload({
        dataType: 'json',
        maxChunkSize: MAX_FILE_SIZE * 1000000, // 10 MB
        done: function(e, data) {
            loadMIDI(e, data);
        }
    });
    $('input').keypress(function (e) {
        // If 'Enter' key is pressed
        if (e.which == 13) {
          updateParams(true);
          return false;
        }
    });
    
    // Set the default view of editor to the very bottom
    canvasContainer.scrollTo(0, canvasContainer.scrollHeight);

    Log(LOG_LOG, "Editor Initialized!");
}

function updateParams(shouldReadInput) {
    Log(LOG_LOG, "Updating Editor parameters");
    if (shouldReadInput) {
        // Update internal variables with newly inputted values
        BPM = parseInt($("#input_BPMCount").val());
        SongLength = parseInt($("#input_LengthPerPage").val());
    }

    if (BPM > MAX_BPM) {
        Log(LOG_WARNING, `Input BPM (${BPM}) exceeds maximum BPM (${MAX_BPM})`);
        BPM = MAX_BPM;
    }
    else if (BPM <= 0) {
        Log(LOG_ERROR, `BPM must be greater than 0. Setting to default value.`);
        BPM = 240;
    }

    $("#input_BPMCount").val(BPM);

    if (SongLength > MAX_SONG_LEN) {
        Log(LOG_WARNING, `Length (${SongLength  }) exceeds maximum length (${MAX_SONG_LEN})`);
        SongLength = MAX_SONG_LEN;
    }
    else if (SongLength <= 0) {
        Log(LOG_ERROR, `Length must be greater than 0. Setting to default value.`);
        SongLength = 30;
    }

    $("#input_LengthPerPage").val(SongLength);

    NOTES_PER_PAGE = (BPM / 60) * (SongLength) * 4;
    NOTES_PER_PAGE = Math.ceil(NOTES_PER_PAGE);
    console.log(NOTES_PER_PAGE);
    // Update note editor view
    populate();
    var canvasContainer = document.getElementById("Editor");
    // Scroll all the way down again
    canvasContainer.scrollTo(0, canvasContainer.scrollHeight);
    // Update UI with new info
    updateUI();
}

function updateUI() {
    var lenInSeconds = Math.round(Pages.length * SongLength * 100) / 100;
    var lenInMinutes = Math.floor(lenInSeconds / 60);
    lenInSeconds = (lenInSeconds % 60).toString().padStart(2, "0");
    $("#prop_SongLength").text(lenInMinutes + ":" + lenInSeconds);
}


// Populates current page
function populate() {
    Stage.removeAllChildren();
    Stage.clear();
    canvas.height = 0;
    // Setting up panner
    var bps = BPM / 60; // Beats per second
    var spb = 1 / bps;  // Seconds per beat
    var Notes = Pages[CURRENT_PAGE];
    // Render 4/4 measures in 16th note granularity
    let NOTES_PER_MEASURE = 16;
    for (var timeSegm = (NOTES_PER_PAGE / NOTES_PER_MEASURE) - 1; timeSegm >= 0 ; timeSegm--) {
        var segment = new createjs.Shape();
        segment.graphics.beginFill("Purple").drawRect(0, 0, NOTE_WIDTH / 2, (NOTE_HEIGHT) * NOTES_PER_MEASURE + (5 * (NOTES_PER_MEASURE - 1)));
        segment.x = 50;
        segment.y = (timeSegm * ((NOTE_HEIGHT) * NOTES_PER_MEASURE + (5 * (NOTES_PER_MEASURE - 1))) + timeSegm * 5);
        if (segment.y + ((NOTE_HEIGHT) * NOTES_PER_MEASURE + (5 * (NOTES_PER_MEASURE - 1))) > canvas.height) {
            canvas.height = segment.y + (NOTE_HEIGHT) * NOTES_PER_MEASURE + (5 * (NOTES_PER_MEASURE - 1));
        }
        Stage.addChild(segment);
        segment.snapToPixel = true;
    }
    // Render time labels & notes
    for (var row = 0; row < NOTES_PER_PAGE; row++) {
        var lenInSeconds = (spb / 4) * ((NOTES_PER_PAGE) - row) + (CURRENT_PAGE * SongLength);
        var lenInMilliseconds = ((lenInSeconds % 1) * 1000);
        var lenInMinutes = Math.floor(lenInSeconds / 60);
        lenInSeconds = Math.floor(lenInSeconds % 60).toString().padStart(2, "0");
        lenInMilliseconds = (lenInMilliseconds).toString().substring(0, 2).padStart(2, "0");
        var timeLabel = lenInMinutes + ":" + lenInSeconds + ":" + lenInMilliseconds;
        var textStyle = "12px Arial";
        var textColor = "White";
        if (row % 2 != 0) {
            textStyle = "10px Arial";
            textColor = "DimGray";
        }
        var time = new createjs.Text(timeLabel, textStyle, textColor);
        time.x = 43;
        time.y = (row * NOTE_HEIGHT + row * 5) - 5;
        time.textAlign = "right";
        Stage.addChild(time);
        time.snapToPixel = true;

        if (Notes[row] == undefined) {
            Notes[row] = [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY];
        }

        for (var col = 0; col < 5; col++) {
            var selectable = new createjs.Shape();
            var color = DEFAULT_NOTE_COLOR;
            if (Notes[row][col]) {
                color = SELECTED_NOTE_COLOR;
                selectable.scaleY = Notes[row][col] + ((Notes[row][col] - 1) * (5 / NOTE_HEIGHT));
            }
            selectable.graphics.beginFill(color).drawRect(0, 0, NOTE_WIDTH, NOTE_HEIGHT);
            selectable.x = (col * NOTE_WIDTH + col * 5) + 75;
            selectable.y = (row * NOTE_HEIGHT + row * 5);
            selectable.coord = { col: col, row: row, len: 1 };
            selectable.selected = false;
            selectable.addEventListener("click", handleNoteClick);
            selectable.addEventListener("mousedown", handleNoteDown);
            selectable.addEventListener("pressmove", handleNoteMove);
            selectable.addEventListener("pressup", handleNoteUp);
            Stage.addChild(selectable);
            selectable.snapToPixel = true;
            selectable.regY = NOTE_HEIGHT;
            selectable.y = selectable.y + NOTE_HEIGHT;
        }
    }
    Stage.update();
}

// When user clicks on an add page button
function handleAddPage() {
    if (Pages.length >= MAX_PAGES) {
        Log(LOG_WARNING, `Unable to add page. Exceeds maximum page count (${MAX_PAGES})`);
        return;
    }
    Pages[Pages.length] = [];
    var button = $("<div></div>").addClass("pageButton");
    button.text((Pages.length).toString());
    button.insertBefore("#AddPage");
    button.on("click", handlePageClick);

    updateUI();
}

// When user clicks on a page button
function handlePageClick(e) {
    $(".pageButton.active").removeClass("active");
    $(this).addClass("active");
    CURRENT_PAGE = parseInt($(this).text()) - 1;
    populate();
}

// When user clicks on a button from the right-click menu
function handlePageContextClick(options, key, root) {
    var pageVal = root.$trigger.text();
    var page = parseInt(pageVal) - 1;
    switch (key) {
        case "copy":
            Log(LOG_LOG, `Copying contents of page ${pageVal}`);
            clipboard = Pages[page];
            break;
        case "paste":
            Log(LOG_LOG, `Pasting contents to page ${pageVal}`);
            if (clipboard === undefined) {
                Log(LOG_ERROR, `There is nothing to be pasted!`);
            }
            else {
                Pages[page] = clipboard;
                populate();
            }
            break;
        case "clear":
            Log(LOG_LOG, `Clearing contents of page ${pageVal}`);
            Pages[page] = [];
            // Update if we're viewing the current page
            if (page === CURRENT_PAGE)
                populate();
            break;
        case "delete":
            if (Pages.length === 1) {
                Log(LOG_ERROR, `Unable to delete page 1. Clear the page instead.`);
                return;
            }
            Log(LOG_LOG, `Deleting page ${pageVal}`);
            Pages.splice(page, 1);
            
            $(".pageButton").each(function (i, el) {
                if ($(el).attr("id") == "AddPage") return;
                $(el).remove();
            })
            var counter = 0;
            while (counter < Pages.length) {
                var button = $("<div></div>").addClass("pageButton");
                button.text(counter + 1);
                button.insertBefore("#AddPage");
                button.on("click", handlePageClick);
                counter++;
            }

            // Select the first page
            CURRENT_PAGE = 0;
            $(".pageButton.active").removeClass("active");
            var el = $(".pageButton").get(CURRENT_PAGE);
            $(el).addClass("active");
            populate();
            break;
    }
}

const mouseDelta = { x: 0, y: 0 };
function handleNoteDown (e) {
    currentScale = e.target.scaleY;
    e.bubbles = false;
    isNoteDown = true;
    var coord = e.target.coord;
    var x = e.target.x;
    var y = e.target.y;
    
    var Notes = Pages[CURRENT_PAGE];
    if (e.target.selected) {
        e.target.selected = false;
        e.target.graphics.clear().beginFill(DEFAULT_NOTE_COLOR).drawRect(0, 0, NOTE_WIDTH, NOTE_HEIGHT);
        Notes[coord.row][coord.col] = EMPTY;
        e.target.scaleY = 1;
    }
    else {
        e.target.selected = true;
        e.target.graphics.clear().beginFill(SELECTED_NOTE_COLOR).drawRect(0, 0, NOTE_WIDTH, NOTE_HEIGHT);
        Notes[coord.row][coord.col] = SIXTEENTH;
    }
    Stage.update();
    mouseDelta.x = x;
    mouseDelta.y = y;
}

function handleNoteMove (e) {
    if (isNoteDown) {
    
        e.bubbles = false;
        var source_x = e.target.x;
        var source_y = e.target.y;

        var curr_x = e.stageX;
        var curr_y = e.stageY;

        var deltaX = source_x - curr_x;
        var deltaY = source_y - curr_y;
        
        mouseDelta.x -= curr_x;
        mouseDelta.y -= curr_y;

        var coord = e.target.coord;
        var Notes = Pages[CURRENT_PAGE];

        let currentScale = Math.round(e.target.scaleY);
        if (currentScale < 4 && (deltaY  - (currentScale * 5)) > NOTE_HEIGHT) {
            currentScale = Math.round((deltaY  - (currentScale * 5)) / NOTE_HEIGHT);
            if (currentScale > 4 || currentScale == 3) currentScale = 4;
            let offset = (currentScale - 1) * (5 / NOTE_HEIGHT);
            e.target.scaleY = currentScale + offset;
            e.target.coord.len = currentScale;
            let objs = Stage.getObjectsUnderPoint(curr_x, curr_y, 0);
            for (let idx in objs) {
                if (objs[idx] != e.target) {
                    var c = objs[idx].coord;
                    objs[idx].selected = false;
                    objs[idx].scaleY = 1;
                    objs[idx].graphics.clear().beginFill(DEFAULT_NOTE_COLOR).drawRect(0, 0, NOTE_WIDTH, NOTE_HEIGHT);
                    objs[idx].coord.len = 1;
                    Notes[c.row][c.col] = EMPTY;
                }
            }
            Notes[coord.row][coord.col] = currentScale;
        }
        else if (mouseDelta.y < 0) {
            currentScale = Math.round(deltaY / NOTE_HEIGHT);
            if (currentScale > 4) currentScale = 4;
            if (currentScale == 3) currentScale = 2;
            if (currentScale == 0) currentScale = 1;
            let offset = (currentScale - 1) * (5 / NOTE_HEIGHT);
            e.target.coord.len = currentScale;
            e.target.scaleY = currentScale + offset;
            Notes[coord.row][coord.col] = currentScale;
        }
        Stage.update();
    }
}

function handleNoteUp (e) {
    e.bubbles = false;
    isNoteDown = false;
}

// When user clicks on a note box in the editor
function handleNoteClick (e) {
    
}

// When user clicks on "Save JSON" button
function saveJSON(e) {
    Log(LOG_LOG, `Saving ${Pages.length} page(s) to JSON`);
    var notesToSave = [];
    console.log(Pages);
    for (var page = 0; page < Pages.length; page++) {
        var notes = Pages[page];
        if (notes === undefined) continue;
        for (var row = notes.length - 1; row >= 0; row--) {
            if (notes[row] === undefined || notes[row] === null) {
                notes.splice(row, 1);
            }
            console.log(notes[row]);
            notesToSave.push(notes[row]);
        }
    }
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "save", true);
    xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    // send the collected data as JSON
    xhr.send(JSON.stringify(notesToSave));
    // on receive, get the response data and download it
    // see: http://www.alexhadik.com/blog/2016/7/7/l8ztp8kr5lbctf5qns4l8t3646npqh 
    xhr.onloadend = function (e) {
        if (this.status == 200) {
            var blob = new Blob([this.response], { type: 'application/json' });
            let a = document.createElement("a");
            a.style = "display: none";
            document.body.appendChild(a);
            let url = window.URL.createObjectURL(blob);
            a.href = url;
            a.download = 'sequence.json';
            a.click();
            window.URL.revokeObjectURL(url);
            Log(LOG_SUCCESS, `Save complete!`);
        } else {
            Log(LOG_ERROR, `Error occurred while saving! Status: ${ this.status }`);
        }
    };
}

function loadMIDI(e, data) {
    const noteData = JSON.parse(data.jqXHR.responseText);
    console.log(noteData);
    populateFromMIDI(noteData);
}

// When user clicks on "Load JSON" button
function loadJSON(e, data) {
    const noteData = JSON.parse(data.jqXHR.responseText);
    console.log(noteData)
    // Data will come in one giant array. We need to split it up into pages
    // Clear existing page data
    var currentPage = 0;
    Pages = [];
    Pages[currentPage] = [];
    NOTES_PER_PAGE = Math.min(noteData.length, NOTES_PER_PAGE);
    $(".pageButton").each(function (i, el) {
        if ($(el).attr("id") == "AddPage") return;
        $(el).remove();
    })
    var bps = BPM / 60; // Beats per second
    var spb = 1 / bps;  // Seconds per beat
    var sps = spb / 4;  // Seconds per sixteenth note
    var len = noteData.length * sps;
    if (len < MAX_SONG_LEN) {
        SongLength = len;
    }
    else {
        SongLength = MAX_SONG_LEN;
    }

    NOTES_PER_PAGE = (BPM / 60) * (SongLength) * 4;

    // Running data set backwards so first notes are last
    for (var setIdx = noteData.length - 1; setIdx >= 0; setIdx--) {
        currentPage = Math.floor((setIdx) / NOTES_PER_PAGE);
        if (Pages[currentPage] === undefined) { 
            Pages[currentPage] = [];
        }
        Pages[currentPage].push(noteData[setIdx]);
    }

    CURRENT_PAGE = 0;
    if (Pages.length >= 1) {
        var counter = Pages.length;
        while (counter > 0) {
            var button = $("<div></div>").addClass("pageButton");
            button.text((Pages.length - counter + 1).toString());
            button.insertBefore("#AddPage");
            button.on("click", handlePageClick);
            counter--;
        }
    }
    $(".pageButton.active").removeClass("active");
    var el = $(".pageButton").get(CURRENT_PAGE);
    $(el).addClass("active");

    populate();
    updateUI();
    Log(LOG_SUCCESS, `Load complete!`);
}

function populateFromMIDI(midi) {
    //BPM = midi.header.bpm;
    const tracks = midi.tracks;
    var bps = BPM / 60; // Beats per second
    var spb = 1 / bps;  // Seconds per beat
    var sps = spb / 4;  // Seconds per sixteenth note
    var len = midi.duration;
    var pageLen = Math.round(len / sps);
    if (len < MAX_SONG_LEN) {
        SongLength = len;
    }
    else {
        SongLength = MAX_SONG_LEN;
    }

    NOTES_PER_PAGE = (BPM / 60) * (SongLength) * 4;

    var noteData = [];
    for (let trackIdx in midi.tracks) {
        let track = midi.tracks[trackIdx];
        if (track.duration == 0) continue;
        for (let noteIdx in track.notes) {
            let note = track.notes[noteIdx];
            let noteLen = Math.round(note.duration / sps);
            let noteStart = Math.round(note.time / sps);
            if (noteData[noteStart] === undefined) {
                noteData[noteStart] = [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY];
            }
            noteData[noteStart][trackIdx - 1] = noteLen;
            //console.log(`Track ${trackIdx}: note ${noteIdx} len ${noteLen}`);
        }
    }
    
    var currentPage = 0;
    Pages = [];
    Pages[currentPage] = [];
    $(".pageButton").each(function (i, el) {
        if ($(el).attr("id") == "AddPage") return;
        $(el).remove();
    })
    // Running data set backwards so first notes are last
    for (var setIdx = noteData.length - 1; setIdx >= 0; setIdx--) {
        currentPage = Math.floor((setIdx) / NOTES_PER_PAGE);
        if (Pages[currentPage] === undefined) { 
            Pages[currentPage] = [];
        }
        if (noteData[setIdx] === undefined) {
            noteData[setIdx] = [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY];
        }
        Pages[currentPage].push(noteData[setIdx]);
    }
    CURRENT_PAGE = 0;
    if (Pages.length >= 1) {
        var counter = Pages.length;
        while (counter > 0) {
            var button = $("<div></div>").addClass("pageButton");
            button.text((Pages.length - counter + 1).toString());
            button.insertBefore("#AddPage");
            button.on("click", handlePageClick);
            counter--;
        }
    }
    $(".pageButton.active").removeClass("active");
    var el = $(".pageButton").get(CURRENT_PAGE);
    $(el).addClass("active");

    updateParams(false);
    Log(LOG_SUCCESS, `Load complete!`);
}

// Add util functions if they're not supported by browser yet
function polyfill() {
    // https://github.com/uxitten/polyfill/blob/master/string.polyfill.js
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart
    if (!String.prototype.padStart) {
        String.prototype.padStart = function padStart(targetLength,padString) {
            targetLength = targetLength>>0; //floor if number or convert non-number to 0;
            padString = String((typeof padString !== 'undefined' ? padString : ' '));
            if (this.length > targetLength) {
                return String(this);
            }
            else {
                targetLength = targetLength-this.length;
                if (targetLength > padString.length) {
                    padString += padString.repeat(targetLength/padString.length); //append to original to ensure we are longer than needed
                }
                return padString.slice(0,targetLength) + String(this);
            }
        };
    }
}

function Log(logType, logMessage) {
    const Log = $("<div></div>");
    let color;
    Log.text("> " + logMessage);
    switch (logType) {
        case LOG_LOG:
            color = LOG_COLOR;
            break;
        case LOG_WARNING:
            color = WARNING_COLOR;
            break;
        case LOG_ERROR:
            color = ERROR_COLOR;
            break;
        case LOG_SUCCESS:
            color = SUCCESS_COLOR;
            break;
    }
    Log.css("color", color);
    MessageLog.prepend(Log);
}