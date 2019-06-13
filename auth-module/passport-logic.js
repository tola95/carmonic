var notifications = require('../notifications/notifications.js');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var pool = require("../db-module/postgres-logic").pool;
var stringConstants = require("../string-constants.json");
var logger = require('../logging-module/winston-logic.js').logger;
var passwordEncryptUtil = require('./passwordEncryptionUtil.js');
var AWS = require('aws-sdk');

AWS.config.loadFromPath('./awsConfig.json');

/*
 * AUTHENTICATION LOGIC
 */

var LOCAL_STRATEGY_CONFIG = {
    usernameField: stringConstants.EMAIL,
    passwordField: stringConstants.PASSWORD,
    session: false,
    passReqToCallback: true
};

var LOCAL_STRATEGY_CONFIG_MECHANIC = {
    usernameField: stringConstants.EMAIL,
    passwordField: stringConstants.PASSWORD,
    session: false,
    passReqToCallback: true
};

passport.use(stringConstants.SIGNUP, new LocalStrategy(
    LOCAL_STRATEGY_CONFIG,
    function (req, username, password, done) {
        // find a user in postgres with provided username
        //ToDo: Sanitise inputs

        pool.query('SELECT * FROM "Customers" WHERE "email"=$1', [req.body.email], (err, result) => {
            if (err) {
                logger.error("Problem searching for customer " + req.body.email + " in database");
                logger.error(err);
                return done(err);
            }

            if (result.rows[0]) {
                var user = result.rows[0];
                logger.info("Customer " + req.body.email + " already exists");
                return done(null, {email: user.email}, {message: "User already exists"});
            } else {
                passwordEncryptUtil.cryptPassword(req.body.password, function(encryptionError, hash) {
                    if (encryptionError) {
                        logger.error("Problem adding customer " + req.body.email + " to database");
                        logger.error(encryptionError);
                    } else {

                    pool.query('INSERT INTO "Customers" ("firstname", "lastname", "email", "password") VALUES ($1, $2, $3, $4)', [req.body.firstname, req.body.lastname, req.body.email, hash], function (err, result) {
                        if (err) {
                            logger.error("Problem adding customer " + req.body.email + " to database");
                            logger.error(err);
                            return done(err);
                        } else {
                            pool.query('COMMIT');
                            logger.info("Customer " + req.body.email + " created");
                            // var email = notifications.generateRawEmail(req.body.email, stringConstants.SIGNUP_EMAIL_TITLE, stringConstants.SIGNUP_EMAIL_MESSAGE)
                            //
                            // new AWS.SES({apiVersion: '2010-12-01'}).sendRawEmail(email, function (err, data) {
                            //     if (err) {
                            //         console.error(err, err.stack);
                            //     }
                            //     else {
                            //         console.log(data);
                            //     }
                            // });

                            return done(null, {
                                email: req.body.email
                            }, {message: "Successfully signed up"});
                        }
                    });
                }
                });
            }
        });
    })
);

passport.use(stringConstants.LOGIN, new LocalStrategy(
    LOCAL_STRATEGY_CONFIG,
    function (req, username, password, done) {
        pool.query('SELECT * FROM "Customers" WHERE "email"=$1', [req.body.email], (err, result) => {
            if (err) {
                logger.error("Problem searching for customer " + req.body.email + " in database");
                logger.error(err);
                return done(err);
            }

            if (result.rows[0]) {
                var hashword = result.rows[0].password;
                passwordEncryptUtil.comparePassword(req.body.password, hashword, function (encryptionError, passwordMatch) {
                    if (encryptionError) {
                        logger.error("Problem searching for customer " + req.body.email + " in database");
                        logger.error(encryptionError);
                    } else if (passwordMatch) {
                        pool.query('SELECT * FROM "Customers" WHERE "email"=$1', [req.body.email], (err, result) => {
                            if (err) {
                                logger.error("Problem searching for customer " + req.body.email + " in database");
                                logger.error(err);
                                return done(err);
                            }

                            if (result.rows[0]) {
                                var user = result.rows[0];
                                logger.info("Customer " + req.body.email + " successfully logged in");
                                return done(null, user, {message: "Successfully logged in"});
                            } else {
                                logger.info("Incorrect login attempt for " + req.body.email);
                                return done(null, {}, {message: "Incorrect username or password"});
                            }
                        });
                    }
                });
            }
        });

    })
);

passport.use('deleteaccount', new LocalStrategy(
    LOCAL_STRATEGY_CONFIG,
    function (req, username, password, done) {
        pool.query('DELETE FROM "Customers" WHERE "email"=$1 AND "password"=$2', [req.body.email, req.body.password], (err, result) => {
            if (err) {
                logger.error("Problem searching for customer " + req.body.email + " in database");
                logger.error(err);
                return done(err);
            }
            return done(null, {}, {message: "Successfully deleted account"});
        });
    }
));

//ToDo: Auto-generate password for mechanics
passport.use('signupMechanic', new LocalStrategy(
    LOCAL_STRATEGY_CONFIG_MECHANIC,
    function (req, username, password, done) {
        // find a user in postgres with provided username
        //ToDo: Sanitise inputs
        pool.query('SELECT * FROM "TestMechanics" WHERE "email"=$1', [req.body.email], (err, result) => {
            if (err) {
                logger.error("Problem searching for mechanic " + req.body.email + " in database");
                logger.error(err);
                return done(err);
            }

            passwordEncryptUtil.cryptPassword(req.body.password, function(encryptionError, hash) {
                if (encryptionError) {
                    logger.error("Problem adding mechanic " + req.body.email + " to database");
                    logger.error(encryptionError);
                } else {
                    if (result.rows[0]) {
                        var user = result.rows[0];
                        logger.info("Mechanic " + req.body.email + " already exists");
                        return done(null, {email: user.email}, {message: "User already exists"});
                    } else {
                        pool.query('INSERT INTO "TestMechanics" ("firstname", "lastname", "phone_number", "email", "password") VALUES ($1, $2, $3, $4, $5)', [req.body.firstname, req.body.lastname, req.body.phoneNumber, req.body.email, hash], function (err, result) {
                            if (err) {
                                logger.error("Problem adding mechanic " + req.body.email + " to database");
                                logger.error(err);
                                return done(err);
                            } else {
                                pool.query('COMMIT');
                                logger.info("Mechanic " + req.body.email + " created");
                                return done(null, {
                                    email: req.body.email
                                }, {message: "Successfully signed up"});
                            }
                        });
                    }
                }
            });
        });
    })
);

passport.use('loginMechanic', new LocalStrategy(
    LOCAL_STRATEGY_CONFIG_MECHANIC,
    function (req, username, password, done) {
        pool.query('SELECT * FROM "TestMechanics" WHERE "email"=$1', [req.body.email], (err, result) => {
            if (err) {
                logger.error("Problem searching for mechanic " + req.body.email + " in database");
                logger.error(err);
                return done(err);
            }
            if (result.rows[0]) {
                var hashword = result.rows[0].password;
                passwordEncryptUtil.comparePassword(req.body.password, hashword, function (encryptionError, passwordMatch) {
                    if (encryptionError) {
                        logger.error("Problem searching for mechanic " + req.body.email + " in database");
                        logger.error(encryptionError);
                    } else if (passwordMatch) {
                        pool.query('SELECT * FROM "TestMechanics" WHERE "email"=$1', [req.body.email], (err, result) => {
                            if (err) {
                                logger.error("Problem searching for mechanic " + req.body.email + " in database");
                                logger.error(err);
                                return done(err);
                            }

                            if (result.rows[0]) {
                                var user = result.rows[0];
                                logger.info("Mechanic " + req.body.email + " successfully logged in");
                                return done(null, user, {message: "Successfully logged in"});
                            } else {
                                logger.info("Incorrect login attempt for " + req.body.email);
                                return done(null, {}, {message: "Incorrect username or password"});
                            }
                        });
                    }
                });
            }
        })
    })
);

passport.use('deleteMechanic', new LocalStrategy(
    LOCAL_STRATEGY_CONFIG_MECHANIC,
    function (req, username, password, done) {
        pool.query('DELETE FROM "TestMechanics" WHERE "name"=$1', [req.body.email], (err, result) => {
            if (err) {
                logger.error("Problem searching for mechanic " + req.body.email + " in database");
                logger.error(err);
                return done(err);
            }
            return done(null, {}, {message: "Successfully deleted account"});
        });
    }
));


exports.passport = passport;