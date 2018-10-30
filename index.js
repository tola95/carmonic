const express = require('express');
const app = express();
const { Pool } = require('pg');
var config = require('./config.json');
var server = require('http').Server(app);
const io = require('socket.io')(server);
io.set('origins', '*:*');
var passport = require('passport')
    , LocalStrategy = require('passport-local').Strategy;
var bodyParser = require("body-parser");

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

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

//On starting the app we add the distance function to our Postgres instance
pool.query(config.DISTANCE_FUNCTION, [], (err, result) => {
    if (err) {
        console.log(err.stack);
    }
});

/*
 * SOCKET.IO LOGIC
 */

//Object storing the current socket connections to the server
var currentConnections = {};

io.on('connection', function (socket) {
    console.log('a user connected');

    //On launching the front end mechanic app, the mechanic sends this event, registering his socket in the current connections
    //Note that the key in the currentConnections is the username of the mechanic, so we can look up active mechanics via their username
    socket.on('mechanic_register', function (data) {
        if (data) {
            console.log('mechanic ' + data + ' registered');
            currentConnections[data] = {mechanicUsername: data, socket: socket};
            socket._username = data;
        }
    });

    //On launching the front end customer app, the customer sends this event, registering his socket in the current connections
    //Note that the key in the currentConnections is the username of the customer, so we can look up active customers via their username
    socket.on('customer_register', function (data) {
        if (data) {
            console.log('customer ' + data + ' registered');
            currentConnections[data] = {customerUsername : data, socket : socket};
            socket._username = data;
        }
    });

    //On closing the app, the reference to the corresponding party's socket connection is terminated
    socket.on('disconnect', function(){
        if (socket._username) {
            delete currentConnections[socket._username];
            console.log('user disconnected');
            console.log('person ' + socket._username + ' de-registered');
        }
    });
});

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
        //res.send('Yes');
        res.send(req.user);
    }
);

app.post('/login',
    passport.authenticate('local'),
    function(req, res) {
        // `req.user` contains the authenticated user.
        //res.redirect('/users/' + req.user.username);
    }
);

// app.get('/signup.html', function(req, res){
//     res.render('test-front-end/signup.html', {});
// });


app.get('/getMechanics', (req, res) => {
    if (req.query) {
        var longitude = req.query.longitude;
        var latitude = req.query.latitude;

        //ToDo: Validate longitude and latitude are legitimate values

        if (longitude && latitude) {
            console.log(longitude);
            console.log(latitude);

            pool.query('SELECT * FROM "Mechanic" ORDER BY distance($1, $2, lat, lng) LIMIT $3;', [latitude, longitude, NUMBER_OF_MECHANICS], (err, result) => {
                if (err) {
                    console.log(err.stack);
                    res.send("There was an error retrieving mechanics from the database");
                }
                console.log('mechanic:', result.rows);
                res.send(result.rows);
            });
        } else {
            res.send("Wrong latitude and longitude parameters")
        }
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
