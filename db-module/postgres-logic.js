const { Pool } = require('pg');
var config = require('./config.json');
const stringConstants = require("../string-constants.json");
var logger = require('../logging-module/winston-logic.js').logger;

/*
 * POSTGRES LOGIC
 */

//Maximum number of mechanics to return in a getMechanics query
var NUMBER_OF_MECHANICS = 5;

//Config for the database connection
const pool = new Pool({
    user: config.MECHANIC_DB_USER,
    host: config.MECHANIC_DB_ENDPOINT,
    database: config.MECHANIC_DB_DATABASE,
    password: config.MECHANIC_DB_PASSWORD,
    port: 5432,
});

pool.on(stringConstants.PG_ERROR_EVENT, (err, client) => {
    logger.error('Unexpected error on idle client');
});

//On starting the app we add the distance function to our Postgres instance
pool.query(config.DISTANCE_FUNCTION, [], (err, result) => {
    if (err) {
        logger.error("Error adding distance function to database");
        logger.error(err);
    }
});

exports.getClosestMechanics = function (latitude, longitude, callback) {
    //ToDo: Validate longitude and latitude are legitimate values
    if (longitude && latitude) {
        pool.query('SELECT * FROM "TestMechanics" ORDER BY distance($1, $2, latitude, longitude) LIMIT $3;', [latitude, longitude, NUMBER_OF_MECHANICS], (err, result) => {
            if (err) {
                logger.error("Problem searching for mechanics closest to latitude " + latitude + " longitude " + longitude +" in database");
                logger.error(err);
                callback({message: "There was an error retrieving mechanics from the database"});
            }
            return callback(result);
        });
    } else {
        callback({message: "Wrong latitude and longitude parameters"});
    }
};

exports.addPaymentCode = function (accessKey, email) {
    if (accessKey && email) {
        pool.query('UPDATE "Customers" SET "paymentCode"=$1 WHERE "email"=$2', [accessKey, email], function (err, result) {
            if (err) {
                logger.error("Problem adding access key (payment code) for customer " + email + " to database");
                logger.error(err);
                console.log("Problem adding access key (payment code) " + accessKey + " for customer " + email + " to database")
            } else {
                pool.query('COMMIT');
                logger.info("Access key (payment code) added for customer " + email);
                console.log("Access key (payment code) added for customer " + email);
            }
        });
    }

};

exports.charge = function (email, callback) {
    pool.query('SELECT * FROM "Customers" WHERE "email"=$1', [email], (err, result) => {
        if (err) {
            logger.error("Problem searching for customer " + email + " in database");
            logger.error(err);
            return {};
        }

        if (result.rows[0]) {
            callback(result.rows[0]);
        } else {
            logger.error("Attempted to charge customer " + req.body.email + " but does not exist");
        }
        return {};
    });
};

exports.addFeedback = function (mechanicId, customerId, compliment, feedback, starRating, bill, callback) {
    const date = new Date().getTime();
    pool.query('INSERT INTO "Feedback" ("customerId", "mechanicId", "feedback", "compliment", "starRating", "date", "bill") VALUES ($1, $2, $3, $4, $5, $6, $7)', [customerId, mechanicId, feedback, compliment, starRating, date, bill], (err, result) => {
        if (err) {
            logger.error("Problem inserting feedback from customer with id " + customerId + " into database");
            logger.error(err);
            callback({message: "error"})
        } else {
            callback({message: "success"});
        }
    });
};

exports.pool = pool;

