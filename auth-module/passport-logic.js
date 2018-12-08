var passport = require('passport')
    , LocalStrategy = require('passport-local').Strategy;
var pool = require("../db-module/postgres-logic").pool;
var stringConstants = require("../string-constants.json");
var logger = require('../logging-module/winston-logic.js').logger;

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
    usernameField: "name",
    passwordField: "name",
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
                pool.query('INSERT INTO "Customers" ("firstname", "lastname", "email", "password") VALUES ($1, $2, $3, $4)', [req.body.firstname, req.body.lastname, req.body.email, req.body.password], function (err, result) {
                    if (err) {
                        logger.error("Problem adding customer " + req.body.email + " to database");
                        logger.error(err);
                        return done(err);
                    } else {
                        pool.query('COMMIT');
                        logger.info("Customer " + req.body.email + " created");
                        return done(null, {
                            email: req.body.email
                        }, {message: "Successfully signed up"});
                    }
                });
            }
        });
    })
);

passport.use(stringConstants.LOGIN, new LocalStrategy(
    LOCAL_STRATEGY_CONFIG,
    function (req, username, password, done) {
        pool.query('SELECT * FROM "Customers" WHERE "email"=$1 AND "password"=$2', [req.body.email, req.body.password], (err, result) => {
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
    })
);

passport.use('signupMechanic', new LocalStrategy(
    LOCAL_STRATEGY_CONFIG_MECHANIC,
    function (req, username, password, done) {
        // find a user in postgres with provided username
        //ToDo: Sanitise inputs
        pool.query('SELECT * FROM "TestMechanics" WHERE "name"=$1', [req.body.name], (err, result) => {
            if (err) {
                logger.error("Problem searching for mechanic " + req.body.name + " in database");
                logger.error(err);
                return done(err);
            }

            if (result.rows[0]) {
                var user = result.rows[0];
                logger.info("Mechanic " + req.body.name + " already exists");
                return done(null, {name: user.name}, {message: "User already exists"});
            } else {
                pool.query('INSERT INTO "TestMechanics" ("name", "latitude", "longitude", "phone_number") VALUES ($1, $2, $3, $4)', [req.body.name, req.body.latitude, req.body.longitude, req.body.phoneNumber], function (err, result) {
                    if (err) {
                        logger.error("Mechanic adding customer " + req.body.name + " to database");
                        logger.error(err);
                        return done(err);
                    } else {
                        pool.query('COMMIT');
                        logger.info("Mechanic " + req.body.name + " created");
                        return done(null, {
                            name: req.body.name
                        }, {message: "Successfully signed up"});
                    }
                });
            }
        });
    })
);

exports.passport = passport;