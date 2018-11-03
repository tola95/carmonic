var passport = require('passport')
    , LocalStrategy = require('passport-local').Strategy;
var pool = require("../db-module/postgres-logic").pool;
var stringConstants = require("../string-constants.json");
/*
 * AUTHENTICATION LOGIC
 */

var LOCAL_STRATEGY_CONFIG = {
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
                console.log(err);
                return done(err);
            }

            if (result.rows[0]) {
                var user = result.rows[0];
                console.log("customer " + req.body.email + " already exists");
                //res.send("Customer already exists");
                //new entry signifies if the customer did not exist previously
                return done(null, {email: user.email}, {message: "User already exists"});
            } else {
                pool.query('INSERT INTO "Customers" ("firstname", "lastname", "email", "password") VALUES ($1, $2, $3, $4)', [req.body.firstname, req.body.lastname, req.body.email, req.body.password], function (err, result) {
                    if (err) {
                        console.log(err);
                        console.log("Problem adding customer to database");
                        return done(err);
                    } else {
                        pool.query('COMMIT');
                        console.log("customer " + req.body.email + " created");
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
                console.log(err);
                return done(err);
            }

            if (result.rows[0]) {
                var user = result.rows[0];
                console.log("customer " + req.body.email + " is logging in");
                //res.send("Customer already exists");
                return done(null, user, {message: "Successfully logged in"});
            } else {
                console.log("customer " + req.body.email + " with password " + req.body.password + " does not exist");
                return done(null, {}, {message: "Incorrect username or password"});
            }
        });
    })
);

exports.passport = passport;