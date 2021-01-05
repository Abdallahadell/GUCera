const express = require('express');
const mssql = require('mssql');
const app = express();
const port = 3000;
const path = require('path');
const fs = require('fs');

var read = fs.readFileSync("config.json");
var config = JSON.parse(read);

var conn = new mssql.ConnectionPool(config);

app.use(express.json());
app.use(express.urlencoded());

app.set('views', path.join(__dirname, 'views'));
app.set('view engine','ejs');

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', function(req, res) {
    res.render('login');
});

app.get('/registration', function(req, res) {
    res.render('registration');
});

app.post('/register', function(req, res) {
    conn.connect();
    var procedure = ["studentRegister", null, false, true];
    runProcedure(req.body, procedure);
    res.redirect('/login');
});

function runProcedure(body, proc) {
    var inputs = []
    for (var key in body){
        input = [key, body[key], false, false];
        inputs.push(input);
    }
    inputs.push(proc);
    // inputs[input][3] corresponds to a output statement
    // inputs[input][4] corresponds to an execute statement
    conn.connect().then(() => {
        var request = new mssql.Request(conn);
        for (input in inputs){
            if (!inputs[input][2] && !inputs[input][3]){
                request.input(inputs[input][0], inputs[input][1])
            }
            else if(inputs[input][2]){
                request.output(inputs[input][0], inputs[input][1])
            }
            else{
                request.execute(inputs[input][0]).then(function (recordSet) {
                    console.log(recordSet + " this is the record set");
                    conn.close();
                }).catch(function (err) {
                    console.log(err + " this is error1");
                    conn.close();
                });
                break;
            }
        }
    }).catch(function (err) {
        console.log(err + " this is error2");
    });
}

function runStudentRegister(req) {
    conn.connect().then(function () {
        var request = new mssql.Request(conn);
        request.input('first_name', req.body.firstName);
        request.input('last_name', req.body.lastName);
        request.input('password', req.body.password);
        request.input('email', req.body.email);
        request.input('gender', req.body.gender);
        request.input('address', req.body.address);
        request.execute("studentRegister").then(function (recordSet) {
            console.log(recordSet + " this is the record set");
            conn.close();
        }).catch(function (err) {
            console.log(err + " this is error1");
            conn.close();
        });
    }).catch(function (err) {
        console.log(err + " this is error2");
    });
}

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});