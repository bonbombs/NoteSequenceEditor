const express = require('express')
const app = express()
const fileUpload = require('express-fileupload')
const bodyParser = require('body-parser')
var path = require('path')
var stream = require('stream')
var fs = require('fs')

const jsonParser = bodyParser.json({limit: '50mb', type: 'application/json'});

const PORT = (process.env.PORT) ? process.env.PORT : 8080;
<<<<<<< HEAD

// Load 
=======
>>>>>>> 5b8f40281b5c18cbc6a3158761b368baf324fd66
app.use(express.static('public'))
app.use(fileUpload())

/**  Server Router Handlers go below **/

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/public/index.html'));
});

app.post("/save", jsonParser, (req, res) => {
    if (!req.body) return res.sendStatus(400);
    console.log("Saving...");
    var formattedContent = FormatClientToSys(JSON.parse(JSON.stringify(req.body)));
    var fileContents = Buffer.from(JSON.stringify(formattedContent));
    var readStream = new stream.PassThrough();
    readStream.end(fileContents);
    var fileName = "sequence.json";
    console.log("DONE")
    var savedFilePath = path.join(__dirname + '/saved/' + fileName);
    fs.writeFile(savedFilePath, fileContents, function() {
        res.status(200).download(savedFilePath, fileName);
    });
});

app.post('/upload', function(req, res) {
    if (!req.files)
        return res.status(400).send('No files were uploaded.');

    let file = req.files.noteSequence;
    let json = JSON.parse(file.data.toString('utf8'))
    var formatted = FormatSysToClient(json);
    var fileName = "sequence.json";
    var savedFilePath = path.join(__dirname + '/saved/' + fileName);
    file.mv(savedFilePath, function(err) {
        if (err)
          return res.status(500).send(err);
        res.setHeader('Content-Type', 'application/json');
        res.json(formatted);
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
                if (lastTrue !== -1) {
                    var noteA = serializedSet;
                    serializedSet = {
                        "isDouble": true,
                        "noteA": noteA,
                        "noteB": {
                            "target": serializedTarget,
                            "noteType": "*sixteenth"
                        }
                    }
                } else {
                    serializedSet = {
                        "target": serializedTarget,
                        "noteType": "*sixteenth"
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
        var serializedSet = [false, false, false, false, false];
        var isDouble = note.isDouble;
        if (isDouble !== undefined) {
            var targetA = GetIndexFromTarget(note.noteA.target);
            var targetB = GetIndexFromTarget(note.noteB.target);
            serializedSet[targetA] = true;
            serializedSet[targetB] = true;
        }
        else {
            var stringType = note.noteType;
            if (stringType === "*fourth") {
                emptyBufferCount = 3;
            } else if (stringType === "*eighth") {
                emptyBufferCount = 1;
            }
            var target = GetIndexFromTarget(note.target);
            if (target !== -1 || note.noteType !== "*empty") {
                serializedSet[target] = true;
            }
        }
        result.push(serializedSet);
        // If we have non-sixteenth notes, push empty sets
        while (emptyBufferCount > 0) {
            result.push([false, false, false, false, false]);
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