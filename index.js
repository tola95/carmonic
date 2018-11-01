const express = require('express');
const app = express();
var server = require('http').Server(app);
var passport = require('passport')
    , LocalStrategy = require('passport-local').Strategy;
var bodyParser = require("body-parser");
require("./db-module/postgres-logic");
require("./auth-module/socket-io-logic");
require("./auth-module/passport-logic");


/*
 * HTTP ENDPOINTS
 */
app.use(express.static('./'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(passport.initialize());

app.get('/', (req, res) => res.send('Welcome to Carmonic'));

app.post('/signup',
    passport.authenticate('signup', {
        session: false
    }),
    function(req, res) {
        // `req.user` contains the authenticated user.
        //res.redirect('/users/' + req.user.username);
        //res.send('Yes');
        res.send(req.user);
    }
);

app.post('/login',
    passport.authenticate('local'),
    function(req, res) {
        // `req.user` contains the authenticated user.
        //res.redirect('/users/' + req.user.username);
    }
);

app.get('/getMechanics', (req, res) => {
    if (req.query) {
        var longitude = req.query.longitude;
        var latitude = req.query.latitude;

        //ToDo: Validate longitude and latitude are legitimate values

        if (longitude && latitude) {
            console.log(longitude);
            console.log(latitude);

            pool.query('SELECT * FROM "Mechanic" ORDER BY distance($1, $2, lat, lng) LIMIT $3;', [latitude, longitude, NUMBER_OF_MECHANICS], (err, result) => {
                if (err) {
                    console.log(err.stack);
                    res.send("There was an error retrieving mechanics from the database");
                }
                console.log('mechanic:', result.rows);
                res.send(result.rows);
            });
        } else {
            res.send("Wrong latitude and longitude parameters")
        }
    }
});

app.get('/notifyMechanic', (req, res) => {
    var mechanicUsername = req.query.mechanicUsername;
    var customerUsername = req.query.customerUsername;
    console.log(mechanicUsername);
    io.to(currentConnections[mechanicUsername].socket.id).emit('job', customerUsername);
    res.send(mechanicUsername);
});

server.listen(3000, function() {
    console.log('Carmonic listening on port 3000!');
});
