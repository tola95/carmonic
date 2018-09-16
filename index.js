const express = require('express');
const app = express();
const { Pool } = require('pg');
var config = require('./config.json');

var NUMBER_OF_MECHANICS = 5;

const pool = new Pool({
    user: config.MECHANIC_DB_USER,
    host: config.MECHANIC_DB_ENDPOINT,
    database: config.MECHANIC_DB_DATABASE,
    password: config.MECHANIC_DB_PASSWORD,
    port: 5432,
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

pool.query(config.DISTANCE_FUNCTION, [], (err, result) => {
    if (err) {
        console.log(err.stack);
    }
});

app.get('/', (req, res) => res.send('Welcome to Carmonic'));

app.get('/getMechanics', (req, res) => {
    var longitude = req.query.longitude;
    var latitude = req.query.latitude;

    console.log(longitude);
    console.log(latitude);

    pool.query(config.SELECT_MECHANICS_QUERY, [latitude, longitude, NUMBER_OF_MECHANICS], (err, result) => {
        console.log("Here1");
        if (err) {
            console.log("Here2");
            console.log(err.stack);
        }
        console.log('mechanic:', result.rows);
        pool.end();
        res.send(result.rows);
    });
});

app.listen(3000, function() {
    console.log('Carmonic listening on port 3000!');
});
