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
const { addCustomer, addMechanic, cancelJob, endJob, mechanicAccept, setupJob } = require('./networks/JobCoordinator');

const credentials = {
    key: fs.readFileSync('carmonic.key'),
    cert: fs.readFileSync('carmonic.crt'),
};

const https = require('https');
const httpsServer = https.createServer(credentials, app);
const {io, getClosestMechanics} = require("./auth-module/socket-io-logic")(httpsServer);
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
    //expressJwt({secret: secret}),
    (req, res) => {
        if (req.query) {
            var longitude = req.query.longitude;
            var latitude = req.query.latitude;

            res.send(getClosestMechanics(latitude, longitude));
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

            postgresLogic.getCustomer(email, function (result) {
                user = result.response;
                if (user && user.paymentCode) {
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
                            res.send({message: "success", status: body.data.status})
                        }
                    });
                } else {
                    res.send({message: "error"});
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

//ToDo: Store bill associated with this job as base 64 string
app.post('/mechanicFeedback',
    function (req, res) {
        postgresLogic.addFeedback(
            req.body.mechanicId,
            req.body.customerId,
            req.body.compliment,
            req.body.feedback,
            req.body.starRating,
            null,
            (result) => {
            res.send(result);
        });
    }
);

app.post('/history',
    function (req, res) {
        if (req.body.customerId) {
            postgresLogic.getFeedbackForCustomer(
                req.body.customerId,
                (result) => {
                    res.send(result);
                });
        } else if (req.body.mechanicId) {
            postgresLogic.getFeedbackForMechanic(
                req.body.mechanicId,
                (result) => {
                    res.send(result);
                });
        } else {
            res.send({message: "error"});
        }

    }
);

// JOB-RELATED API CALLS


app.get('/initiateJob',
    function(req, res) {
        if (req.query) {
            var customerId = req.query.customerId;
            var longitude = req.query.longitude;
            var latitude = req.query.latitude;
            var fcmToken = req.query.fcmToken;

            addCustomer(customerId, longitude, latitude, fcmToken).then(() => {
                setupJob(customerId, latitude, longitude).then(() => {
                    res.send({message: "success"});
                }).catch(error => res.send({message: error}));
            }).catch(error => res.send({message: error}));
        } else {
            res.send({message: "error"});
        }
    }
);

app.get('/mechStatusChange',
    function(req, res) {
        if (req.query) {
            var mechanicId = req.query.mechanicId;
            var longitude = req.query.longitude;
            var latitude = req.query.latitude;
            var fcmToken = req.query.fcmToken;

            addMechanic(mechanicId, longitude, latitude, fcmToken).then(() => {
                res.send({message: "success"});
            }).catch((error) => {
                res.send({message: error});
            });
        } else {
            res.send({message: "error"});
        }
    }
);

app.get('/mechAcceptJob',
    function(req, res) {
        if (req.query) {
            var customerId = req.query.customerId;
            var mechanicId = req.query.mechanicId;

            mechanicAccept(mechanicId, customerId).then(() => {
                res.send({message: "success"});
            }).catch((error) => {
                res.send({message: error});
            });
        }
        res.send({message: "error"});
    }
);

app.get('/custStatusChange',
    function(req, res) {
        if (req.query) {
            var customerId = req.query.customerId;
            var longitude = req.query.longitude;
            var latitude = req.query.latitude;
            var fcmToken = req.query.fcmToken;

            addCustomer(customerId, longitude, latitude, fcmToken).then(() => {
                res.send({message: "success"});
            }).catch((error) => {
                res.send({message: error});
            });
        } else {
            res.send({message: "error"});
        }
    }
);

app.get('/cancelJob',
    function(req, res) {
        if (req.query) {
            var customerId = req.query.customerId;
            var mechanicId = req.query.mechanicId;
            var canceller = req.query.canceller;

            cancelJob(customerId, mechanicId, canceller).then(() => {
                res.send({message: "success"});
            }).catch((error) => {
                res.send({message: error});
            });
        } else {
            res.send({message: "error"});
        }
    }
);

app.get('/endJob',
    function(req, res) {
        if (req.query) {
            var customerId = req.query.customerId;
            var mechanicId = req.query.mechanicId;

            endJob(customerId, mechanicId).then(() => {
                res.send({message: "success"});
            }).catch((error) => {
                res.send({message: error});
            });
        } else {
            res.send({message: "error"});
        }
    }
);

server.listen(3000, function() {
    console.log('Carmonic listening on port 3000!');
});
httpsServer.listen(8443, function() {
    console.log('Carmonic listening securely on port 8443!');
});
