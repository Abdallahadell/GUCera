const express = require('express');
const mssql = require('mssql');
const app = express();
const port = 3000;
var path = require('path');

var config = {
    server: 'localhost\\SQLEXPRESS', 
    database: 'GUCera',
    user: 'qamal',
    password: 'habd'
};

app.set('views', path.join(__dirname, 'views'));
app.set('view engine','ejs');

app.get('/', (req, res) => {
    try {
    mssql.connect(config);
    }
    catch(err) {
        console.log(err);
    };
    res.redirect('/login');
});

app.get('/login', function(req,res) {
    res.render('login');
}); 

app.get('/registration', function(req,res) {
    res.render('registration');
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});