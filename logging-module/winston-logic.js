var winston = require('winston');
require('winston-daily-rotate-file');

var transport = new (winston.transports.DailyRotateFile)({
    filename: 'carmonic-%DATE%.log',
    datePattern: 'YYYY-MM-DD-HH',
    zippedArchive: true,
    dirname: './logs',
    maxSize: '20m',
    maxFiles: '14d'
});

transport.on('rotate', function(oldFilename, newFilename) {
});

var logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        transport
    ]
});

exports.logger = logger;