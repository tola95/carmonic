const express = require('express');
const app = express();
const { Pool } = require('pg');
var config = require('./config.json');
var server = require('http').Server(app);
const io = require('socket.io')(server);
io.set('origins', '*:*');

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

var currentConnections = {};

io.on('connection', function (socket) {
    console.log('a user connected');
    socket.on('mechanic_register', function (data) {
        console.log('mechanic ' + data + ' registered');
        currentConnections[data] = {mechanicUsername : data, socket : socket};
        socket._username = data;
    });
    socket.on('customer_register', function (data) {
        console.log('customer ' + data + ' registered');
        currentConnections[data] = {customerUsername : data, socket : socket};
        socket._username = data;
    });
    socket.on('disconnect', function(){
        delete currentConnections[socket._username];
        console.log('user disconnected');
        console.log('person ' + socket._username + ' de-registered');
    });
});

app.get('/', (req, res) => res.send('Welcome to Carmonic'));

app.get('/getMechanics', (req, res) => {
    var longitude = req.query.longitude;
    var latitude = req.query.latitude;

    console.log(longitude);
    console.log(latitude);

    pool.query('SELECT * FROM "Mechanic" ORDER BY distance($1, $2, lat, lng) LIMIT $3;', [latitude, longitude, NUMBER_OF_MECHANICS], (err, result) => {
        if (err) {
            console.log(err.stack);
        }
        console.log('mechanic:', result.rows);
        res.send(result.rows);
    });
});

app.get('/notifyMechanic', (req, res) => {
    var mechanicUsername = req.query.username;
    io.to(currentConnections[mechanicUsername].socket.id).emit('job');
    res.send(mechanicUsername);
});

server.listen(3000, function() {
    console.log('Carmonic listening on port 3000!');
});
