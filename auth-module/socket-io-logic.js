const stringConstants = require("../string-constants.json");
var pool = require("../db-module/postgres-logic").pool;
var logger = require('../logging-module/winston-logic.js').logger;

module.exports = function (server) {
    const io = require('socket.io').listen(server);
    io.set('origins', '*:*');
    /*
     * SOCKET.IO LOGIC
     */

    //Object storing the current socket connections to the server
    var currentConnections = {};

    //ToDo: If mechanic and customer have the same ID there will be a conflict in concurrent connections, sort this
    io.on('connection', function (socket) {
        console.log('a user connected');

        //On launching the front end mechanic app, the mechanic sends this event, registering his socket in the current connections
        //Note that the key in the currentConnections is the username of the mechanic, so we can look up active mechanics via their username
        socket.on(stringConstants.SOCKET_MECHANIC_REGISTRATION_EVENT, function (data) {
            console.log(data);

            data = parseIfString(data);
            var id = "m_" + data.id;
            if (data) {
                currentConnections[id] = {mechanicUsername: id, socket: socket, mechanic: data};
                socket._username = id;
            }
        });

        //On launching the front end customer app, the customer sends this event, registering his socket in the current connections
        //Note that the key in the currentConnections is the username of the customer, so we can look up active customers via their username
        socket.on(stringConstants.SOCKET_CUSTOMER_REGISTRATION_EVENT, function (data) {
            data = parseIfString(data);
            var id = "c_" + data.id;
            if (data) {
                console.log('customer ' + data.firstname + ' ' + data.lastname + ' registered');
                currentConnections[id] = {customerUsername : id, socket : socket, customer: data};
                socket._username = id;
            }
        });

        socket.on('customer_request_job', function (mechanic, customer) {
            mechanic = parseIfString(mechanic);
            customer = parseIfString(customer);
            if (mechanic) {
                var connection = currentConnections["m_" + mechanic.id];
                if (connection) {
                    io.to(currentConnections["m_" + mechanic.id].socket.id).emit('job_req', mechanic, customer);
                    console.log('customer ' + customer.firstname + ' ' + customer.lastname + ' requested mechanic ' + mechanic.email + ' job');
                }
            }
        });

        socket.on('customer_cancel_job', function (mechanic, customer) {
            mechanic = parseIfString(mechanic);
            customer = parseIfString(customer);
            if (mechanic) {
                var connection = currentConnections["m_" + mechanic.id];
                if (connection) {
                    io.to(currentConnections["m_" + mechanic.id].socket.id).emit('job_canc', mechanic, customer);
                    console.log('customer ' + customer.firstname + ' ' + customer.lastname + ' cancelled mechanic ' + mechanic.email + ' job');
                }
            }
        });

        socket.on('mechanic_accept_job', function (mechanic, customer) {
            mechanic = parseIfString(mechanic);
            customer = parseIfString(customer);
            if (mechanic && customer) {
                var connection = currentConnections["c_" + customer.id];
                if (connection) {
                    io.to(currentConnections["c_" + customer.id].socket.id).emit('job_acc', mechanic);
                    console.log('mechanic ' + mechanic.email + ' accepted customer ' + customer.firstname + ' ' + customer.lastname + ' job');
                }
            }
        });

        socket.on('mechanic_reject_job', function (mechanic, customer) {
            mechanic = parseIfString(mechanic);
            customer = parseIfString(customer);
            if (mechanic && customer) {
                var connection = currentConnections["c_" + customer.id];
                if (connection) {
                    io.to(currentConnections["c_" + customer.id].socket.id).emit('job_reject', mechanic);
                    console.log('mechanic ' + mechanic.email + ' rejected customer ' + customer.firstname + ' ' + customer.lastname + ' job');
                }
            }
        });

        socket.on('mechanic_start_job', function (mechanic, customer) {
            mechanic = parseIfString(mechanic);
            customer = parseIfString(customer);
            if (mechanic && customer) {
                console.log('mechanic ' + mechanic.email + ' started customer ' + customer.firstname + ' ' + customer.lastname + ' job');
                var connection = currentConnections["c_" + customer.id];
                if (connection) {
                    io.to(currentConnections["c_" + customer.id].socket.id).emit('job_start', mechanic);
                }
            }
        });

        socket.on('mechanic_conclude_job', function (mechanic, customer, bill) {
            mechanic = parseIfString(mechanic);
            customer = parseIfString(customer);
            if (mechanic && customer) {
                var connection = currentConnections["c_" + customer.id];
                if (connection) {
                    io.to(currentConnections["c_" + customer.id].socket.id).emit('job_con', mechanic, bill);
                    console.log('mechanic ' + mechanic.email + ' concluded customer ' + customer.firstname + ' ' + customer.lastname + ' job');
                }
            }
        });

        socket.on('mechanic_update_location', function (mechanic, customer) {
            mechanic = parseIfString(mechanic);
            customer = parseIfString(customer);
            if (mechanic && customer) {
                if (currentConnections["c_" + customer.id]) {
                    io.to(currentConnections["c_" + customer.id].socket.id).emit('update_location', mechanic);
                    console.log('mechanic ' + mechanic.email + ' updated current location to lat: ' + mechanic.latitude + ' and long: ' + mechanic.longitude);
                }
            } else if (mechanic) {
                //In this case, the mechanic is not currently on a job. We just update his location in the DB
                if (currentConnections["m_" + mechanic.id]) {
                    currentConnections["m_" + mechanic.id].mechanic.latitude = mechanic.latitude;
                    currentConnections["m_" + mechanic.id].mechanic.longitude = mechanic.longitude;
                    logger.info("Mechanic " + mechanic.email + " updated location");
                    console.log('mechanic ' + mechanic.email + ' updated current location to lat: ' + mechanic.latitude + ' and long: ' + mechanic.longitude);
                }
            }
        });

        socket.on('customer_update_location', function (mechanic, customer) {
            mechanic = parseIfString(mechanic);
            customer = parseIfString(customer);
            if (mechanic && customer) {
                var connection = currentConnections["m_" + mechanic.id];
                if (connection) {
                    io.to(currentConnections["m_" + mechanic.id].socket.id).emit('update_location', mechanic, customer);
                    console.log('customer ' + customer.firstname + ' ' + customer.lastname + ' updated current location to lat: ' + customer.latitude + ' and long: ' + customer.longitude);
                }
            }
        });

        //On closing the app, the reference to the corresponding party's socket connection is terminated
        socket.on(stringConstants.SOCKET_DISCONNECT_EVENT, function() {
            if (socket._username) {
                delete currentConnections[socket._username];
                console.log('user disconnected');
                console.log('person ' + socket._username + ' de-registered');
            }
        });
    });

    function getClosestMechanics(lat, lng) {
        return Object.keys(currentConnections)
            .map(key => {
                var connection = currentConnections[key];
                if (connection && !!connection.mechanic) {
                    return connection.mechanic;
                }
            })
            .filter(mechanic => {
                return !!mechanic && !!mechanic.latitude && !!mechanic.longitude
            })
            .sort(function(x, y) {
                console.log(x.latitude);
                console.log(y.latitude);
                if (dist(lat, lng, x.latitude, x.longitude) < dist(lat, lng, y.latitude, y.longitude)) {
                    return 1;
                }
                if (dist(lat, lng, x.latitude, x.longitude) > dist(lat, lng, y.latitude, y.longitude)) {
                    return -1;
                }
                return 0;
            })
            .slice(0, 5);
    }

    return {io: io, currentConnections: currentConnections, getClosestMechanics: getClosestMechanics};
};

function parseIfString(data) {
    if (typeof data === "string") {
        return JSON.parse(data);
    }
    return data;
}

function dist(x1, x2, y1, y2) {
    return Math.hypot(x2-y2, x1-y1);
}