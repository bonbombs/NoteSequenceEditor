const express = require('express')
const app = express()
const bodyParser = require('body-parser')
var path = require('path')
var stream = require('stream')
var fs = require('fs')

var jsonParser = bodyParser.json();

app.use(express.static('public'))
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/public/index.html'));
});

app.post("/save", jsonParser, (req, res) => {
    if (!req.body) return res.sendStatus(400);
    console.log(req.body);
    var fileContents = Buffer.from(JSON.stringify(req.body));
    var readStream = new stream.PassThrough();
    readStream.end(fileContents);
    var fileName = "sequence.json";
    var savedFilePath = path.join(__dirname + '/saved/' + fileName);
    fs.writeFile(savedFilePath, fileContents, function() {
        res.status(200).download(savedFilePath, fileName);
    })
})

app.listen(process.env.PORT, () => console.log(`Example app listening on port ${process.env.PORT}!`))

/**
 * Formats the notes from
 *      [
 *          [boolean, boolean, boolean, boolean, boolean],
 *          ...
 *      ]
 * To
 *      {
 *      }
 * @param {} data 
 */
function FormatClientToSys(data) {

}

/**
 * Formats the notes from
 *      {
 *      }
 * To
 *      [
 *          [boolean, boolean, boolean, boolean, boolean],
 *          ...
 *      ]
 * @param {} data 
 */
function FormatSysToClient(data) {

}