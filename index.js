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
const request = require('request');
const googleConfig = require('./googleConfig');
const paystackConfig = require('./paystackConfig');

const credentials = {
    key: fs.readFileSync('carmonic.key'),
    cert: fs.readFileSync('carmonic.crt'),
};

const https = require('https');
const httpsServer = https.createServer(credentials, app);
const {io, currentConnections} = require("./auth-module/socket-io-logic")(httpsServer);
var pool = require("./db-module/postgres-logic").pool;

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
        if (req.authInfo.deliverToken) {
            var key = paystackConfig.secret_key;
            var email = req.user.email;
            var reference = req.user.paymentReference;
            var accessKey;

            jwt.sign(req, function(err, req) {
                if (err) {
                    res.send(err);
                    return;
                }
                delete req.authInfo.deliverToken;
                response = {
                    user: req.user,
                    authInfo: req.authInfo
                };
                res.send(response);
            });

            //Register a key for the customer that can be used to charge them for future payments
            request.get({
                headers: {
                    "Authorization": "Bearer " + key
                },
                url: "https://api.paystack.co/transaction/verify/" + reference,
            }, function (error, response, body) {
                body = JSON.parse(body);
                if (!!body.data && !!body.data.authorization) {
                    accessKey = body.data.authorization.authorization_code;
                    postgresLogic.addPaymentCode(accessKey, email);
                }
            });
        } else {
            response = {
                user: req.user,
                authInfo: req.authInfo
            };
            res.send(response);
        }
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

app.get('/getEstimatedDistance',
    expressJwt({secret: secret}),
    (req, res) => {
        if (req.query) {
            var fromLongitude = req.query.fromLongitude;
            var fromLatitude = req.query.fromLatitude;

            var toLongitude = req.query.toLongitude;
            var toLatitude = req.query.toLatitude;

            request("https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial"
                + "&origins=" + fromLatitude + "," + fromLongitude
                + "&destinations=" + toLatitude + "," + toLongitude
                + "&key=" + googleConfig.google_maps_key,
                function (error, response, body) {
                    console.log(body);
                    body = JSON.parse(body);
                    var duration = body.rows[0].elements[0].duration;
                    var time = duration != null ? duration.text : "unknown";
                    console.log(time);
                    res.send(time);
            });
        }
    }
);

app.get('/charge',
    expressJwt({secret: secret}),
    (req, res) => {
        if (req.query) {
            var email = req.query.email;
            var amount = req.query.amount;
            var key = paystackConfig.secret_key;

            postgresLogic.charge(email, function (user) {
                if (user.paymentCode) {
                    var accessKey = user.paymentCode;
                    request.post({
                        headers: {
                            "Authorization": "Bearer " + key,
                            "Content-Type": "application/json"
                        },
                        url: "https://api.paystack.co/transaction/charge_authorization",
                        body: JSON.stringify({
                            email: email,
                            amount: amount,
                            authorization_code: accessKey
                        })
                    }, function (error, response, body) {
                        body = JSON.parse(body);
                        console.log(body);
                        if (!!body.data && !!body.data.status) {
                            res.send({status: body.data.status})
                        }
                    });
                } else {
                    res.send({});
                }

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
