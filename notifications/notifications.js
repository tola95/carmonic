const generateEmail = (emailAddressTo, subject, message) => {
    return {
        Destination: {
            ToAddresses: [
                emailAddressTo
            ]
        },
        Message: {
            Body: {
                Text: {
                    Charset: "UTF-8",
                    Data: message
                }
            },
            Subject: {
                Charset: 'UTF-8',
                Data: subject
            }
        },
        Source: 'camsyscorp@gmail.com'
    }
};

const generateRawEmail = (emailAddressTo, subject, message) => {
    var ses_mail = "From: 'Carmonic' <" + "camsyscorp@gmail.com" + ">\n";
    ses_mail = ses_mail + "To: " + emailAddressTo + "\n";
    ses_mail = ses_mail + "Subject: " + subject + "\n";
    ses_mail = ses_mail + "MIME-Version: 1.0\n";
    ses_mail = ses_mail + "Content-Type: multipart/mixed; boundary=\"NextPart\"\n\n";
    ses_mail = ses_mail + "--NextPart\n";
    ses_mail = ses_mail + "Content-Type: text/html; charset=us-ascii\n\n";
    ses_mail = ses_mail + message + "\n\n";
    ses_mail = ses_mail + "--NextPart--";

    return {
        RawMessage: { Data: new Buffer(ses_mail) },
        Destinations: [ emailAddressTo ],
        Source: "'AWS Tutorial Series' <" + "camsyscorp@gmail.com" + ">'"
    };
};

exports.generateEmail = generateEmail;
exports.generateRawEmail = generateRawEmail;