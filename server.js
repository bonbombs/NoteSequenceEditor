const express = require('express')
const app = express()
const fileUpload = require('express-fileupload')
const bodyParser = require('body-parser')
var path = require('path')
var stream = require('stream')
var fs = require('fs')
const MidiConvert = require('./MidiConvert');

const EMPTY = 0;
const SIXTEENTH = 1;
const EIGHTH = 2;
const FOURTH = 4;

// Define middleware for Express
const jsonParser = bodyParser.json({limit: '50mb', type: 'application/json'});

// Define port number to host server on. Use ENV defined PORT if that exists 
//                                       (For instances like Heroku)
const PORT = (process.env.PORT) ? process.env.PORT : 8080;

// Load middlewares and configure express router
app.use(express.static('public'))
app.use(fileUpload())

/**  Server Router Handlers go below **/

// Default route to index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/public/index.html'));
});

app.post("/save", jsonParser, (req, res) => {
    if (!req.body) return res.sendStatus(400);

    console.log("Saving...");
    // Convert format received from client into format that game system will read in
    var formattedContent = FormatClientToSys(JSON.parse(JSON.stringify(req.body)));
    // Add string formatted content into buffer to pipe into a file
    var fileContents = Buffer.from(JSON.stringify(formattedContent));
    var readStream = new stream.PassThrough();
    readStream.end(fileContents);
    var fileName = "sequence.json";
    var savedFilePath = path.join(__dirname + '/saved/' + fileName);
    // Write the file and send it back to the client
    fs.writeFile(savedFilePath, fileContents, function() {
        console.log("DONE")
        res.status(200).download(savedFilePath, fileName);
    });
});

app.post('/upload', function(req, res) {
    if (!req.files) return res.status(400).send('No files were uploaded.');
    // Grab uploaded file
    let file = req.files.noteSequence;
    // Get file's data (in Buffer type) and convert to string to parse into JSON
    let json = JSON.parse(file.data.toString('utf8'))
    // Format file contents into client readable format
    var formatted = FormatSysToClient(json);

    var fileName = "sequence.json";
    var savedFilePath = path.join(__dirname + '/saved/' + fileName);
    // Save/Overwrite/Move to server locally
    file.mv(savedFilePath, function(err) {
        if (err) return res.status(500).send(err);

        // Send formatted data back to client
        res.setHeader('Content-Type', 'application/json');
        res.json(formatted);
    });
});

app.post('/uploadMIDI', function(req, res) {
    if (!req.files) return res.status(400).send('No files were uploaded.');
    // Grab uploaded file
    let file = req.files.midi;
    let arrBuff = toArrayBuffer(file.data);
    console.log(arrBuff instanceof ArrayBuffer)
    var midi = MidiConvert.parse(arrBuff);
    console.log(midi);
    //console.log(MidiConvert);
    // Get file's data (in Buffer type) and convert to string to parse into JSON
    //let json = JSON.parse(file.data.toString('utf8'))

    // Format file contents into client readable format
    // var formatted = FormatSysToClient(json);

    var fileName = "midi.mid";
    var savedFilePath = path.join(__dirname + '/saved/' + fileName);
    // Save/Overwrite/Move to server locally
    file.mv(savedFilePath, function(err) {
        if (err) return res.status(500).send(err);

        // Send formatted data back to client
        res.setHeader('Content-Type', 'application/json');
        //res.send(file.data.toString('utf8'))
        res.json(midi);
    });
});

// Start server

app.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`))

/// Helper functions 

/**
 * Formats the notes from
 *      [
 *          [boolean, boolean, boolean, boolean, boolean],
 *          ...
 *      ]
 * To
 *      {
 *          "notes": []
 *      }
 * @param {} data 
 */
function FormatClientToSys(data) {
    const result = { notes: [] };
    for (var i = 0; i < data.length; i++) {
        var notes = data[i];
        if (notes === undefined || notes === null) continue;
        var serializedSet = undefined;
        var lastTrue = -1;
        for (var target = 0; target < notes.length; target++) {
            var note = notes[target];
            if (note) {
                var serializedTarget = GetTargetFromIndex(target);
                var type = GetTypeFromNote(note);
                if (lastTrue !== -1) {
                    var noteA = serializedSet;
                    serializedSet = {
                        "isDouble": true,
                        "noteA": noteA,
                        "noteB": {
                            "target": serializedTarget,
                            "noteType": type
                        }
                    }
                } else {
                    serializedSet = {
                        "target": serializedTarget,
                        "noteType": type
                    }
                }
                var lastTrue = target;
            }
        }
        if (serializedSet === undefined) {
            serializedSet = {
                "target": "none",
                "noteType": "*empty"
            }
        }
        result.notes.push(serializedSet);
    }

    return result;
}

/**
 * Formats the notes from
 *      {
 *          "notes": []
 *      }
 * To
 *      [
 *          [boolean, boolean, boolean, boolean, boolean],
 *          ...
 *      ]
 * @param {} data 
 */
function FormatSysToClient(data) {
    const result = [];
    console.log(data);
    for (var i = 0; i < data.notes.length; i++) {
        var note = data.notes[i];
        var emptyBufferCount = 0;
        var serializedSet = [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY];
        var isDouble = note.isDouble;
        if (isDouble !== undefined) {
            var targetA = GetIndexFromTarget(note.noteA.target);
            var targetB = GetIndexFromTarget(note.noteB.target);
            serializedSet[targetA] = GetNoteFromType(note.noteA.noteType);
            serializedSet[targetB] = GetNoteFromType(note.noteB.noteType);
        }
        else {
            var noteType = GetNoteFromType(note.noteType);
            if (noteType === FOURTH) {
                emptyBufferCount = 3;
            } else if (noteType === EIGHTH) {
                emptyBufferCount = 1;
            }
            var target = GetIndexFromTarget(note.target);
            
            if (target !== -1 || noteType !== EMPTY) {
                serializedSet[target] = noteType;
            }
        }
        result.push(serializedSet);
        // If we have non-sixteenth notes, push empty sets
        while (emptyBufferCount > 0 && i == data.notes.length - 1) {
            emptyBufferCount--;
            result.push([EMPTY, EMPTY, EMPTY, EMPTY, EMPTY]);
        }
    }

    return result;
}

function GetIndexFromTarget(targetString) {
    switch (targetString) {
        case "left":
            return 0;
        case "left_cymbal":
            return 1;
        case "center":
            return 2;
        case "right_cymbal":
            return 3;
        case "right":
            return 4;
        default:
            return -1;
    }
}

function GetTargetFromIndex(targetIndex) {
    switch (targetIndex) {
        case 0:
            return "left";
        case 1:
            return "left_cymbal";
        case 2:
            return "center";
        case 3:
            return "right_cymbal";
        case 4:
            return "right";
        default:
            return "none";
    }
}

function GetTypeFromNote(note) {
    switch (note) {
        case EMPTY:
            return "*empty";
        case SIXTEENTH:
            return "*sixteenth";
        case EIGHTH:
            return "*eighth";
        case FOURTH:
            return "*fourth";
        default:
            return "*empty";
    }
}

function GetNoteFromType(note) {
    switch (note) {
        case "*sixteenth":
            return SIXTEENTH;
        case "*eighth":
            return EIGHTH;
        case "*fourth":
            return FOURTH;
        default:
            return EMPTY;
    }
}

function toArrayBuffer(buf) {
    var ab = new ArrayBuffer(buf.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
        view[i] = buf[i];
    }
    return ab;
}