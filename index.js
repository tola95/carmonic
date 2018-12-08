const express = require('express');
const app = express();
var server = require('http').Server(app);
var bodyParser = require("body-parser");
var {io, currentConnections} = require("./auth-module/socket-io-logic")(server);
var postgresLogic = require("./db-module/postgres-logic");
var passport = require("./auth-module/passport-logic").passport;
var crypto = require('crypto');
const expressJwt = require('express-jwt');
//ToDo: Store secret as environment variable for when we scale up
var secret = crypto.randomBytes(256);
const jwt = require('./auth-module/jwt-logic')(secret);
const authenticate = expressJwt({secret : secret});
var logger = require('./logging-module/winston-logic.js');

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
        response = {
            user: req.user,
            authInfo: req.authInfo
        };
        res.send(response);
    }
);

app.post('/login',
    passport.authenticate('login', {
        session: false
    }),
    function(req, res) {
        //generate token
        jwt.sign(req, function(err, req) {
            if (err) {
                res.send(err);
                return;
            }
            response = {
                user: req.user,
                authInfo: req.authInfo
             };

            res.send(response);
        });
    }
);

app.post('/deleteaccount')

app.post('/signupMechanic',
    passport.authenticate('signupMechanic', {
        session: false
    }),
    function(req, res) {
        //generate token
        // jwt.sign(req, function(err, req) {
        //     if (err) {
        //         res.send(err);
        //         return;
        //     }
        //     response = {
        //         user: req.user,
        //         authInfo: req.authInfo
        //     };

            res.send(response);
        //});
    }
);

app.get('/getMechanics',
    expressJwt({secret: secret}),
    (req, res) => {
        if (req.query) {
            var longitude = req.query.longitude;
            var latitude = req.query.latitude;

            postgresLogic.getClosestMechanics(latitude, longitude, function (result) {
                res.send(result.rows);
            });

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
