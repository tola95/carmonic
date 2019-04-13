const jwt = require('jsonwebtoken');

module.exports = function (secret) {

    var sign = function (req, callback) {
        var messageToSign = req.user.email || req.user.name;
        if (messageToSign) {
            jwt.sign({id: messageToSign}, secret, function (err, token) {
                if (err) {
                    return callback("Could not create token", req);
                }
                req.user.token = token;
                return callback(null, req);
            });
        } else if (req.authInfo) {
            return callback(null, req);
        } else {
            return callback("User was not authenticated", req);
        }
    };

    var verify = function (req, callback) {
        if (req.get("authorization")) {
            var token = req.get("authorization");
            console.log(token);
            jwt.verify(token, secret, function(err, decoded) {
                console.log(secret);
                if (err) {
                    return callback("Could not verify token", req);
                }
                console.log(decoded);
                return callback();
            });
        } else {
            return callback("No token in request", req);
        }
    };

    return {sign: sign, verify: verify};
};
