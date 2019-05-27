var bcrypt = require('bcrypt');

var DEFAULT_SALT_ROUNDS = 10;

exports.cryptPassword = function(password, callback) {
    bcrypt.genSalt(DEFAULT_SALT_ROUNDS, function(err, salt) {
        if (err) return callback(err);

        bcrypt.hash(password, salt, function(err, hash) {
            return callback(err, hash);
        });
    });
};

exports.comparePassword = function(plainPass, hashword, callback) {
    bcrypt.compare(plainPass, hashword, function(err, isPasswordMatch) {
        return err == null ?
            callback(null, isPasswordMatch) :
            callback(err);
    });
};
