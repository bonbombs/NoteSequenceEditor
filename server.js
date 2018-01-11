const express = require('express')
const app = express()
const fileUpload = require('express-fileupload')
const bodyParser = require('body-parser')
var path = require('path')
var stream = require('stream')
var fs = require('fs')

const jsonParser = bodyParser.json();

const PORT = (process.env.PORT) ? process.env.PORT : 8080;

app.use(express.static('public'))
app.use(fileUpload())
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/public/index.html'));
});

app.post("/save", jsonParser, (req, res) => {
    if (!req.body) return res.sendStatus(400);
    console.log("Saving...");
    var formattedContent = FormatClientToSys(req.body);
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
     
        res.send(formatted);
    });
});

app.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`))

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
    for (var i = data.length - 1; i >= 0; i--) {
        var notes = data[i];
        //console.log(notes);
        if (notes === undefined || notes === null) continue;
        var serializedSet = undefined;
        for (var target = 0; target < notes.length; target++) {
            var note = notes[target];
            if (note) {
                var serializedTarget = GetTargetFromIndex(target);
                if (serializedSet !== undefined) {
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
    const result = []
    for (var i = 0; i < data.notes.length; i++) {
        var note = data.notes[i];
        // TODO: work on translating notes that are not *sixteenth
        // var stringTarget = note.
        var serializedSet = [false, false, false, false, false];
        var isDouble = note.isDouble;
        if (isDouble) {
            targetA = GetIndexFromTarget(note.noteA.target);
            targetB = GetIndexFromTarget(note.noteB.target);
            serializedSet[targetA] = true;
            serializedSet[targetB] = true;
        }
        else {
            var target = GetIndexFromTarget(note.target);
            if (target !== -1) {
                serializedSet[target] = true;
            }
        }
        result.push(serializedSet);
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