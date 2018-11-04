const { Pool } = require('pg');
var config = require('./config.json');
const stringConstants = require("../string-constants.json");

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
    console.error('Unexpected error on idle client', err);
});

//On starting the app we add the distance function to our Postgres instance
pool.query(config.DISTANCE_FUNCTION, [], (err, result) => {
    if (err) {
        console.log(err.stack);
    }
});

exports.getClosestMechanics = function (latitude, longitude, callback) {
    //ToDo: Validate longitude and latitude are legitimate values
    if (longitude && latitude) {
        console.log(longitude);
        console.log(latitude);

        pool.query('SELECT * FROM "Mapped Mechanics" ORDER BY distance($1, $2, latitude, longitude) LIMIT $3;', [latitude, longitude, NUMBER_OF_MECHANICS], (err, result) => {
            if (err) {
                console.log(err.stack);
                callback({message: "There was an error retrieving mechanics from the database"});
            }
            return callback(result);
        });
    } else {
        callback({message: "Wrong latitude and longitude parameters"});
    }
};

exports.pool = pool;

