const express = require('express');
const app = express();
var server = require('http').Server(app);
var bodyParser = require("body-parser");
var io = require("./auth-module/socket-io-logic")(server).io;
var passport = require("./auth-module/passport-logic").passport;
const jwt = require('jsonwebtoken');
var crypto = require('crypto');
const expressJwt = require('express-jwt');
var secret = crypto.randomBytes(256);
const authenticate = expressJwt({secret : secret});


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
        res.send(req.user);
    }
);

app.post('/login',
    passport.authenticate('login', {
        session: false
    }),
    function(req, res) {
        //generate token
        req.user.token = jwt.sign({
            id: req.body.username,
        }, secret);

        res.send(req.user);
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
