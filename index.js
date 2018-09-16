const express = require('express');
const app = express();
var mysql = require('mysql');
var config = require('./config');

var con = mysql.createConnection({
    host: config.db.MECHANIC_DB_URL,
    user: config.db.MECHANIC_DB_USER,
    password: config.db.MECHANIC_DB_PASSWORD
});

con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
});

app.get('/', (req, res) => res.send('Welcome to Carmonic'));

app.get('/getMechanics', (req, res) => res.send({'mechanicId':'0','latitude':'0','longitude':'0'}));

app.listen(3000, () => con.connect(); console.log('Example app listening on port 3000!'));
