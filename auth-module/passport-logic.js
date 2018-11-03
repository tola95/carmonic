var passport = require('passport')
    , LocalStrategy = require('passport-local').Strategy;
var postgresLogic = require("../db-module/postgres-logic");
var pool = postgresLogic.pool;
/*
 * AUTHENTICATION LOGIC
 */

passport.use('signup', new LocalStrategy({
        passReqToCallback: true
    },
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
                return done(null, user);
            } else {
                pool.query('INSERT INTO "Customers" ("firstname", "lastname", "email", "password") VALUES ($1, $2, $3, $4)', [req.body.firstname, req.body.lastname, req.body.email, req.body.password], function (err, result) {
                    if (err) {
                        console.log(err);
                        console.log("Problem adding customer to database");
                        return done(err);
                    } else {
                        pool.query('COMMIT');
                        console.log(result);
                        console.log("customer " + req.body.email + " created");
                        return done(null, {
                            firstname: req.body.firstname,
                            lastname: req.body.lastname,
                            email: req.body.email,
                            password: req.body.password
                        });
                    }
                });
            }
        });
    })
);

passport.use('login', new LocalStrategy({
        passReqToCallback: true
    },
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
                return done(null, user);
            } else {
                console.log("customer " + req.body.email + " does not exist");
                return done(null, false)
            }
        });
    })
);

exports.passport = passport;