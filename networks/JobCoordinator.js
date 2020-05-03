const pusherConfig = require('../pusherConfig');
const Pusher = require('pusher');
const admin = require("firebase-admin");
const { getCustomerDetails, getMechanicDetails } = require("../db-module/postgres-logic");

var serviceAccount = require('../firebaseConfig');

//ToDo: add logs

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
var activeJobs = {};

//ToDo: Throw if missing or invalid parameters

const addMechanic = (id, lng, lat, fcmToken) => {
    try {
        if (!!activeMechanics[id] && activeMechanics[id].activeJob !== undefined) {
            const job = activeMechanics[id].activeJob;
            const customerId = job.customerId;
            Promise.all([getMechanicDetails(customerId), getCustomerDetails(job.customerId)])
                .then((resolved) => {
                    const mechanic = resolved[0];
                    const customer = resolved[1];

                    return Promise.resolve(sendLocationToCustomer(mechanic, activeCustomers[customerId]));
                });
        } else {
            activeMechanics[id] = { id, lng, lat, fcmToken };
            return Promise.resolve(sendMessage('mechanic_data_updated', {}, fcmToken));
        }
    } catch (error) {
        return Promise.reject(error);
    }

};

const removeMechanic = (id) => {
    try {
        const fcmToken = activeMechanics[id].fcmToken;
        delete activeMechanics[id];

        return Promise.resolve(sendMessage('mechanic_deregister', {}, fcmToken));
    } catch (error) {
        return Promise.reject(error);
    }
};

const addCustomer = (id, lng, lat, fcmToken) => {
    try {
        console.log(JSON.stringify(activeCustomers));
        if (!!activeCustomers[id] && activeCustomers[id].activeJob !== undefined) {
            const job = activeCustomers[id].activeJob;
            const mechanicId = job.mechanicId;
            Promise.all([getMechanicDetails(mechanicId), getCustomerDetails(id)])
                .then((resolved) => {
                    const mechanic = resolved[0];
                    const customer = resolved[1];

                    return Promise.resolve(sendLocationToMechanic(customer, activeMechanics[mechanicId]));
                });
        } else {
            activeCustomers[id] = { id, lng, lat, fcmToken };
            return Promise.resolve(sendMessage('customer_data_updated', {}, fcmToken));
        }
    } catch (error) {
        return Promise.reject(error);
    }
};

const removeCustomer = (id) => {
    try {
        const fcmToken = activeCustomers[id].fcmToken;
        delete activeCustomers[id];

        return Promise.resolve(sendMessage('customer_deregister', {}, fcmToken));
    } catch (error) {
        return Promise.reject(error);
    }
};

const sendLocationToMechanic = (customer, token) => {
    try {
        return Promise.resolve(sendMessage('customer_update_location_to_mechanic', { customer }, token));
    } catch (error) {
        return Promise.reject(error);
    }
};

const sendLocationToCustomer = (mechanic, token) => {
    try {
        return Promise.resolve(sendMessage('mechanic_update_location_to_customer', { mechanic }, token));
    } catch (error) {
        return Promise.reject(error);
    }
};

//ToDo: extract messaging logic to another class
const sendMessage = (event, payload, token) => {
    try {
        var message = {
            data: {
                event: JSON.stringify(event),
                payload: JSON.stringify(payload)
            },
            token
        };

        console.log("sending message " + JSON.stringify(message) + " to user " + JSON.stringify(token));

        admin.messaging()
            .send(message)
            .then((response) => {
                console.log('Successfully sent message:', response);
                return Promise.resolve({response});
            })
            .catch((error) => {
                console.log('Error sending message:', error);
                return Promise.reject({error});
            });
    } catch (error) {
        return Promise.reject(error);
    }
};

const mechanicAcceptJob = (mechanicId, customerId) => {
    activeJobs[customerId] = {customerId, mechanicId};
    activeCustomers[customerId].activeJob = activeJobs[customerId];
    activeMechanics[mechanicId].activeJob = activeJobs[customerId];

    return getMechanicDetails(mechanicId).then((mechanic) => {
        sendMessage('mechanic_accept', { mechanic }, activeCustomers[customerId].fcmToken);
    }).catch((error) => {
        return Promise.reject(error);
    });
};

const setupJob = (customerId, lat, lng) => {
    try {
        getCustomerDetails(customerId).then((customer) => {
            const mechanics = getClosestMechanics(lat, lng);
            if (mechanics.length == 0) {
                console.log("no mechanics");
                return Promise.reject({error: "no mechanics"});
            }

            if (activeJobs[customerId] !== undefined) {
                console.log("customer is already on an active job");
                return Promise.reject({error: "customer is already on an active job"});
            }

            for (const mechanic of mechanics) {
                sendMessage('customer_request', { customer }, mechanic.fcmToken);
            }

            return Promise.resolve({});
        });
    } catch (error) {
        return Promise.reject(error);
    }
};

const cancelJob = (customerId, mechanicId, canceller) => {
    try {
        const customer = activeCustomers[customerId];
        const mechanic = activeMechanics[mechanicId];

        delete activeJobs[customerId];
        activeCustomers[customerId].activeJob = undefined;
        activeMechanics[mechanicId].activeJob = undefined;

        if (canceller === "mechanic") {
            return Promise.resolve(sendMessage('mechanic_cancel_job', { customerId }, customer.fcmToken));
        } else {
            return Promise.resolve(sendMessage('customer_cancel_job', { mechanicId }, mechanic.fcmToken));
        }

    } catch (error) {
        return Promise.reject(error);
    }
};

const endJob = (customerId, mechanicId) => {
    try {
        const customer = activeCustomers[customerId];
        const mechanic = activeMechanics[mechanicId];

        delete activeJobs[customerId];
        activeCustomers[customerId].activeJob = undefined;
        activeMechanics[mechanicId].activeJob = undefined;

        return Promise.resolve(sendMessage('mechanic_end_job', { customerId }, customer.fcmToken));
    } catch (error) {
        return Promise.reject(error);
    }
};

const getClosestMechanics = (lat, lng) => {
    return Object.keys(activeMechanics)
        .map(key => {
            return activeMechanics[key];
        })
        .filter(mechanic => {
            return !!mechanic && !!mechanic.lat && !!mechanic.lng && mechanic.activeJob === undefined
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

function dist(x1, x2, y1, y2) {
    return Math.hypot(x2-y2, x1-y1);
}

exports.addMechanic = addMechanic;
exports.addCustomer = addCustomer;
exports.setupJob = setupJob;
exports.mechanicAccept = mechanicAcceptJob;
