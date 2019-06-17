const express = require('express');
const app = express();
const fs = require('fs');
const server = require('http').Server(app);
const bodyParser = require("body-parser");
const postgresLogic = require("./db-module/postgres-logic");
const passport = require("./auth-module/passport-logic").passport;
const crypto = require('crypto');
const expressJwt = require('express-jwt');
//ToDo: Store secret as environment variable for when we scale up
const secret = crypto.randomBytes(256);
const jwt = require('./auth-module/jwt-logic')(secret);
const authenticate = expressJwt({secret : secret});
const logger = require('./logging-module/winston-logic.js');

const credentials = {
    key: fs.readFileSync('carmonic.key'),
    cert: fs.readFileSync('carmonic.crt'),
};

const https = require('https');
const httpsServer = https.createServer(credentials, app);
const {io, currentConnections} = require("./auth-module/socket-io-logic")(httpsServer);

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

            res.set('Content-Type', 'text/plain');
            res.send(response);
        });
    }
);

app.post('/deleteaccount',
    passport.authenticate('deleteaccount', {
        session: false
    }),
    function (req, res) {
        response = {
            user: req.user,
            authInfo: req.authInfo
        };
        res.send(response);
    }
);

app.post('/signupMechanic',
    passport.authenticate('signupMechanic', {
        session: false
    }),
    function(req, res) {
        response = {
            user: req.user,
            authInfo: req.authInfo
        };
        res.send(response);
    }
);

app.post('/loginMechanic',
    passport.authenticate('loginMechanic', {
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

app.post('/deleteMechanic',
    passport.authenticate('deleteMechanic', {
        session: false
    }),
    function (req, res) {
        response = {
            user: req.user,
            authInfo: req.authInfo
        };
        res.send(response);
    }
);

app.post('/mechanicFeedback',
    passport.authenticate('mechanicFeedback', {
        session: false
    }),
    function (req, res) {
        response = {
            user: req.user,
            authInfo: req.authInfo
        };
        res.send(response);
    }
);

server.listen(3000, function() {
    console.log('Carmonic listening on port 3000!');
});
httpsServer.listen(8443, function() {
    console.log('Carmonic listening securely on port 8443!');
});
