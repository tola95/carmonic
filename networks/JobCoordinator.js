const pusherConfig = require('../pusherConfig');
const Pusher = require('pusher');
const admin = require("firebase-admin");
const { getCustomerDetails } = require("../db-module/postgres-logic");

var serviceAccount = require('../firebaseConfig');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://carmonic-245314.firebaseio.com"
});

var pusher = new Pusher({
    ...pusherConfig
});

pusher.trigger('carmonic-requester-channel', 'server-startup-event', {
    "message": "Hello World! You can start requesting jobs"
});

var activeMechanics = {};
var activeCustomers = {};

const addMechanic = (id, lng, lat, fcmToken) => {
    activeMechanics[id] = { id, lng, lat, fcmToken };
};

const removeMechanic = (id) => {
    delete activeMechanics[id];
};

const addCustomer = (id, lng, lat, fcmToken) => {
    activeCustomers[id] = { id, lng, lat, fcmToken };
};

const removeCustomer = (id) => {
    delete activeCustomers[id];
};

const getAvaliableMechanic = (customerId, lat, lng) => {
    getCustomerDetails(customerId).then((customer) => {
        const mechanics = getClosestMechanics(lat, lng);
        console.log("customer is " + JSON.stringify(customer));
        if (mechanics.length == 0) {
            console.log("no mechanics");
        }
        for (const mechanic of mechanics) {
            var message = {
                data: {
                    event: 'customer_request',
                    customer
                },
                token: mechanic.fcmToken
            };

            console.log("sending message to mechanic " + JSON.stringify(mechanic));

            admin.messaging().send(message)
                .then((response) => {
                    console.log('Successfully sent message:', response);
                })
                .catch((error) => {
                    console.log('Error sending message:', error);
                });
        }
    })
};

const getClosestMechanics = (lat, lng) => {
    return Object.keys(activeMechanics)
        .map(key => {
            return activeMechanics[key];
        })
        .filter(mechanic => {
            return !!mechanic && !!mechanic.lat && !!mechanic.lng
        })
        .sort(function(x, y) {
            if (dist(lat, lng, x.lat, x.lng) < dist(lat, lng, y.lat, y.lng)) {
                return 1;
            }
            if (dist(lat, lng, x.lat, x.lng) > dist(lat, lng, y.lat, y.lng)) {
                return -1;
            }
            return 0;
        })
        .slice(0, 5);
};

exports.addMechanic = addMechanic;
exports.addCustomer = addCustomer;
exports.getAvaliableMechanic = getAvaliableMechanic;
