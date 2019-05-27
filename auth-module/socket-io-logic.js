const stringConstants = require("../string-constants.json");

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
            data = parseIfString(data);
            if (data) {
                console.log('mechanic ' + data.name + ' registered');
                currentConnections[data.id] = {mechanicUsername: data.id, socket: socket};
                socket._username = data.id;
            }
        });

        //On launching the front end customer app, the customer sends this event, registering his socket in the current connections
        //Note that the key in the currentConnections is the username of the customer, so we can look up active customers via their username
        socket.on(stringConstants.SOCKET_CUSTOMER_REGISTRATION_EVENT, function (data) {
            data = parseIfString(data);
            if (data) {
                console.log('customer ' + data.firstname + ' ' + data.lastname + ' registered');
                currentConnections[data.id] = {customerUsername : data.id, socket : socket};
                socket._username = data.id;
            }
        });

        socket.on('customer_request_job', function (mechanic, customer) {
            mechanic = parseIfString(mechanic);
            customer = parseIfString(customer);
            if (mechanic) {
                console.log('customer ' + customer.firstname + ' ' + customer.lastname + ' requested mechanic ' + mechanic.name + ' job');
                var connection = currentConnections[mechanic.id];
                if (connection) {
                    io.to(currentConnections[mechanic.id].socket.id).emit('job_request', mechanic, customer);
                }
            }
        });

        socket.on('mechanic_accept_job', function (mechanic, customer) {
            mechanic = parseIfString(mechanic);
            customer = parseIfString(customer);
            if (mechanic && customer) {
                console.log('mechanic ' + mechanic.name + ' accepted customer ' + customer.firstname + ' ' + customer.lastname + ' job');
                var connection = currentConnections[customer.id];
                if (connection) {
                    io.to(currentConnections[customer.id].socket.id).emit('job_accept', mechanic);
                }
            }
        });

        socket.on('mechanic_reject_job', function (mechanic, customer) {
            mechanic = parseIfString(mechanic);
            customer = parseIfString(customer);
            if (mechanic && customer) {
                console.log('mechanic ' + mechanic.name + ' rejected customer ' + customer.firstname + ' ' + customer.lastname + ' job');
                var connection = currentConnections[customer.id];
                if (connection) {
                    io.to(currentConnections[customer.id].socket.id).emit('job_reject', mechanic);
                }
            }
        });

        socket.on('mechanic_start_job', function (mechanic, customer) {
            mechanic = parseIfString(mechanic);
            customer = parseIfString(customer);
            if (mechanic && customer) {
                console.log('mechanic ' + mechanic.name + ' started customer ' + customer.firstname + ' ' + customer.lastname + ' job');
                var connection = currentConnections[customer.id];
                if (connection) {
                    io.to(currentConnections[customer.id].socket.id).emit('job_start', mechanic);
                }
            }
        });

        socket.on('mechanic_conclude_job', function (mechanic, customer) {
            mechanic = parseIfString(mechanic);
            customer = parseIfString(customer);
            if (mechanic && customer) {
                console.log('mechanic ' + mechanic.name + ' concluded customer ' + customer.firstname + ' ' + customer.lastname + ' job');
                var connection = currentConnections[customer.id];
                if (connection) {
                    io.to(currentConnections[customer.id].socket.id).emit('job_conclude', mechanic);
                }
            }
        });

        socket.on('mechanic_update_location', function (mechanic, customer) {
            mechanic = parseIfString(mechanic);
            customer = parseIfString(customer);
            if (mechanic && customer) {
                console.log('mechanic ' + mechanic.name + ' updated current location to lat: ' + mechanic.latitude + ' and long: ' + mechanic.longitude);
                var connection = currentConnections[customer.id];
                if (connection) {
                    io.to(currentConnections[customer.id].socket.id).emit('update_location', mechanic);
                }
            }
        });

        socket.on('customer_update_location', function (mechanic, customer) {
            mechanic = parseIfString(mechanic);
            customer = parseIfString(customer);
            if (mechanic && customer) {
                console.log('customer ' + customer.firstname + ' ' + customer.lastname + ' updated current location to lat: ' + customer.latitude + ' and long: ' + customer.longitude);
                var connection = currentConnections[mechanic.id];
                if (connection) {
                    io.to(currentConnections[mechanic.id].socket.id).emit('update_location', mechanic, customer);
                }
            }
        });

        //On closing the app, the reference to the corresponding party's socket connection is terminated
        socket.on(stringConstants.SOCKET_DISCONNECT_EVENT, function(){
            if (socket._username) {
                delete currentConnections[socket._username];
                console.log('user disconnected');
                console.log('person ' + socket._username + ' de-registered');
            }
        });
    });

    return {io: io, currentConnections: currentConnections};
};

function parseIfString(data) {
    if (typeof data === "string") {
        return JSON.parse(data);
    }
    return data;
}