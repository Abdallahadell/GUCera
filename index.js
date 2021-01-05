import {config} from './config.js'

const express = require('express');
const mssql = require('mssql');
const app = express();
const port = 3000;
var path = require('path');

var conn = new mssql.ConnectionPool(config);
var connection = conn.connect();
var pool = new mssql.Request(conn);

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

app.post('/registration', function(req, res) {
    connection.then(() => {
        pool.input('first_name', mssql.VarChar(20), req.body.firstName);
        pool.input('last_name', mssql.VarChar(20), req.body.lastName);
        pool.input('password', mssql.VarChar(20), req.body.password);
        pool.input('email', mssql.VarChar(50), req.body.email);
        pool.input('gender', mssql.Bit, req.body.gender);
        pool.input('address', mssql.VarChar(10), req.body.address);
        pool.execute('studentRegister', (err, result) => {
            console.log(result + "result");
        })
    }).catch(err => {
        console.log(err);
    })
});

function runStoredProcedure(req) {
    console.log(req.body);
    return connection.then((pool) => {
        pool.request()
        .input('first_name', mssql.VarChar(20), req.body.firstName)
        .input('last_name', mssql.VarChar(20), req.body.lastName)
        .input('password', mssql.VarChar(20), req.body.password)
        .input('email', mssql.VarChar(50), req.body.email)
        .input('gender', mssql.Bit, req.body.gender)
        .input('address', mssql.VarChar(10), req.body.address)
        .execute('studentRegister', (err, result) => {
            console.log(result)
        })
    }).catch(err => {
        console.log(err);
    })
}

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});