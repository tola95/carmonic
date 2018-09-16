const express = require('express');
const app = express();
const { Pool } = require('pg');
var config = require('./config.json');

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

app.get('/', (req, res) => res.send('Welcome to Carmonic'));

app.get('/getMechanics', (req, res) => res.send({'mechanicId':'0','latitude':'0','longitude':'0'}));

app.listen(3000, function() {
    pool.query('SELECT * FROM "Mechanic" WHERE username = $1', [1], (err, res) => {
        if (err) {
            throw err
        }
        console.log('mechanic:', res.rows[0])
    })
    console.log('Example app listening on port 3000!');
});
