var NOTES_PER_PAGE = 32;
var MAX_PAGES = 10;
var NOTE_WIDTH = 30;
var NOTE_HEIGHT = 30;
var MAX_CANVAS_SIZE = 20000;

// Note Edtior canvas constants
const DEFAULT_NOTE_COLOR = "DarkGray";
const SELECTED_NOTE_COLOR = "DeepSkyBlue";

var BPM = 120;
var SongLength = 30;        // in seconds
var Pages = [];
var CURRENT_PAGE = 0;
var canvas;
var Stage;

function init() {
    polyfill();

    $("#input_BPMCount").val(BPM);
    $("#input_LengthPerPage").val(SongLength);
    NOTES_PER_PAGE = (BPM) * (SongLength / 60) * 4;
    NOTES_PER_PAGE = Math.ceil(NOTES_PER_PAGE);
    Pages[CURRENT_PAGE] = [];
    updateUI();

    if(!(!!document.createElement("canvas").getContext))
    {
        var wrapper = document.getElementById("canvasWrapper");
        wrapper.innerHTML = "Your browser does not appear to support " +
        "the HTML5 Canvas element";
        return;
    }
    var canvasContainer = document.getElementById("Editor");
    canvas = document.getElementById("InteractiveEditor");
    canvas.width = canvasContainer.clientWidth;
    canvas.height = canvasContainer.height;
    Stage = new createjs.Stage(canvas);

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

    $("#AddPage").on("click", handleAddPage);
    var button = $("<div></div>").addClass("pageButton");
    button.text((1).toString());
    button.insertBefore("#AddPage");
    button.on("click", handlePageClick);
    button.addClass("active");
    
    populate();

    $("#SaveJSON").click(saveJSON);
    $('input').keypress(function (e) {
        if (e.which == 13) {
          updateParams();
          return false;
        }
      });

    canvasContainer.scrollTo(0, canvasContainer.scrollHeight);
}

function updateParams() {
    BPM = $("#input_BPMCount").val();
    SongLength = $("#input_LengthPerPage").val();
    NOTES_PER_PAGE = (BPM / 60) * (SongLength) * 4;
    NOTES_PER_PAGE = Math.ceil(NOTES_PER_PAGE);
    populate();
    var canvasContainer = document.getElementById("Editor");
    canvasContainer.scrollTo(0, canvasContainer.scrollHeight);
    updateUI();
}

function updateUI() {
    var lenInSeconds = Pages.length * SongLength;
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
    // Render 4/4 measures
    let NOTES_PER_MEASURE = 16;
    for (var timeSegm = 0; timeSegm < NOTES_PER_PAGE / NOTES_PER_MEASURE; timeSegm++) {
        var segment = new createjs.Shape();
        segment.graphics.beginFill("Purple").drawRect(0, 0, NOTE_WIDTH / 2, (NOTE_HEIGHT) * NOTES_PER_MEASURE + (5 * (NOTES_PER_MEASURE - 1)));
        segment.x = 50;
        segment.y = (timeSegm * ((NOTE_HEIGHT) * NOTES_PER_MEASURE + (5 * (NOTES_PER_MEASURE - 1))) + timeSegm * 5);
        if (segment.y + ((NOTE_HEIGHT) * NOTES_PER_MEASURE + (5 * (NOTES_PER_MEASURE - 1))) > canvas.height) {
            canvas.height = segment.y + (NOTE_HEIGHT) * NOTES_PER_MEASURE + (5 * (NOTES_PER_MEASURE - 1));
        }
        Stage.addChild(segment);
    }
    // Render time labels & notes
    for (var row = 0; row < NOTES_PER_PAGE; row++) {
        var lenInSeconds = spb / 4 * ((NOTES_PER_PAGE) - row) + (CURRENT_PAGE * SongLength);
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
        time.y = (row * NOTE_HEIGHT + row * 5);
        time.textAlign = "right";
        Stage.addChild(time);

        if (Notes[(NOTES_PER_PAGE) - row] == undefined) {
            Notes[(NOTES_PER_PAGE) - row] = [false, false, false, false, false];
        }

        for (var col = 0; col < 5; col++) {
            var selectable = new createjs.Shape();
            var color = DEFAULT_NOTE_COLOR;
            if (Notes[(NOTES_PER_PAGE) - row][col]) {
                color = SELECTED_NOTE_COLOR;
            }
            selectable.graphics.beginFill(color).drawRect(0, 0, NOTE_WIDTH, NOTE_HEIGHT);
            selectable.x = (col * NOTE_WIDTH + col * 5) + 75;
            selectable.y = (row * NOTE_HEIGHT + row * 5);
            selectable.coord = { col: col, row: row };
            selectable.selected = false;
            selectable.addEventListener("click", handleNoteClick);
            Stage.addChild(selectable);
        }
    }
    Stage.update();
}

function handleAddPage() {
    Pages[Pages.length] = [];
    console.log(Pages);
    var button = $("<div></div>").addClass("pageButton");
    button.text((Pages.length).toString());
    button.insertBefore("#AddPage");
    button.on("click", handlePageClick);

    updateUI();
}

function handlePageClick(e) {
    $(".pageButton.active").removeClass("active");
    $(this).addClass("active");
    CURRENT_PAGE = parseInt($(this).text()) - 1;
    populate();
}

function handlePageContextClick(key, options) {

}

function handleNoteClick(e) {
    var coord = e.target.coord;
    var x = e.target.x;
    var y = e.target.y;
    var Notes = Pages[CURRENT_PAGE];
    if (e.target.selected) {
        e.target.selected = false;
        e.target.graphics.clear().beginFill(DEFAULT_NOTE_COLOR).drawRect(0, 0, NOTE_WIDTH, NOTE_HEIGHT);
        Notes[(NOTES_PER_PAGE) - coord.row][coord.col] = false;
    }
    else {
        e.target.selected = true;
        e.target.graphics.clear().beginFill(SELECTED_NOTE_COLOR).drawRect(0, 0, NOTE_WIDTH, NOTE_HEIGHT);
        Notes[(NOTES_PER_PAGE) - coord.row][coord.col] = true;
    }
    Stage.update();
}

function saveJSON(e) {
    var Notes = Pages[CURRENT_PAGE];
    for (var row = Notes.length - 1; row >= 0; row--) {
        console.log(Notes[row]);
    }
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "save", true);
    xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    // send the collected data as JSON
    xhr.send(JSON.stringify(Notes));
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
        }
    };
}

function loadJSON() {
    
}

function serialize() {

}

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