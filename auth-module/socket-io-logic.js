const stringConstants = require("../string-constants.json");

module.exports = function(server) {
    const io = require('socket.io')(server);
    io.set('origins', '*:*');
    /*
     * SOCKET.IO LOGIC
     */

    //Object storing the current socket connections to the server
    var currentConnections = {};

    io.on('connection', function (socket) {
        console.log('a user connected');

        //On launching the front end mechanic app, the mechanic sends this event, registering his socket in the current connections
        //Note that the key in the currentConnections is the username of the mechanic, so we can look up active mechanics via their username
        socket.on(stringConstants.SOCKET_MECHANIC_REGISTRATION_EVENT, function (data) {
            if (data) {
                console.log('mechanic ' + data + ' registered');
                currentConnections[data] = {mechanicUsername: data, socket: socket};
                socket._username = data;
            }
        });

        //On launching the front end customer app, the customer sends this event, registering his socket in the current connections
        //Note that the key in the currentConnections is the username of the customer, so we can look up active customers via their username
        socket.on(stringConstants.SOCKET_CUSTOMER_REGISTRATION_EVENT, function (data) {
            if (data) {
                console.log('customer ' + data + ' registered');
                currentConnections[data] = {customerUsername : data, socket : socket};
                socket._username = data;
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