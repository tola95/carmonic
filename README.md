# Carmonic

## Overview

This repository will serve as a beta back end for the Carmonic application. 

## Architecture

Currently the back end consists of a single Amazon EC2 instance, running a Node.js (ExpressJS) server and an Amazon RDS database running PostgreSQL. These can both be scaled up according to demand later on, but since we are currently in development stage, this setup should suffice.

Our host runs publicly at https://ec2-35-177-219-101.eu-west-2.compute.amazonaws.com:8443

## API Documentation

Note: All through this API Doc, I'll be giving examples of curl requests to a https server, so use --insecure at the end of the command to skip certificate verification.

#### 1) getMechanics 

![Alt text](statics/getMechanics.jpg?raw=true "getMechanics diagram")

##### Description

When logged in, a customer will request a mechanic based on their geographic location. The job of this API is to return the n closest mechanics to the front end app at their current location, regardless of the availability of the mechanic. The complexity of discerning which mechanic to show the client will be handled later in the execution chain. n is currently set to 5, but can be changed to be dynamic based on location, later in development.

Example input: ```GET /getMechanics?longitude=-0.081018&latitude=51.652084```

Example response: ```[{"username":"2","firstname":"Lekki Mechanics","lat":51.652084,"lng":-0.081018},{"username":"1","firstname":"Ikorodu Service Centre","lat":51.517681,"lng":-0.08237}]```

#### 2) signUp

##### Description

Adds the customer to our database if they are not signed up already.

Example request (POST request) : ```curl --data "firstname=Omotola&lastname=Babasola&email=omotola.babasola%40yahoo.com&password=abcdefg" https://ec2-35-177-219-101.eu-west-2.compute.amazonaws.com:8443/signup```

Example response : ```{"user":{"email":"omotola.babasola@yahoo.com"},"authInfo":{"message":"Successfully signed up"}}```

If they are signed up, we return a message indicating that is the case.

Example response : ```{"user":{"email":"omotola.babasola@yahoo.com"},"authInfo":{"message":"User already exists"}}```

There is a test sign up web form at https://ec2-35-177-219-101.eu-west-2.compute.amazonaws.com:8443/test-front-end/customer.html you can use to try this API out


#### 3) logIn

##### Description

Establishes the identity of the client with the server.

NOTE: Hash and salt real passwords before calling this API. DO NOT SEND RAW PASSWORDS OVER THE INTERNET

Example request: ```curl --data "email=omotola.babasola%40yahoo.com&password=abcdefgh" http://ec2-35-177-219-101.eu-west-2.compute.amazonaws.com:3000/login```

Example response: ```{"user":{"id":"8","firstname":"Omotola","lastname":"Babasola","email":"omotola.babasola@yahoo.com","password":"abcdefgh","token":"abc.xyz"},"authInfo":{"message":"Successfully logged in"}}```

The response contains a jwt auth token, which will need to be added to the header of any request sent to the server afterwards, to establish the identity of the user. You will need to add the header in the list of headers such:

Authorization: "Bearer <insert_your_JWT_here>"

If the username and passowrd combination is not present in the database, the response message reflects this.

Example response: ```{"user":{},"authInfo":{"message":"Incorrect username or password"}}```

There is a test sign up web form at https://ec2-35-177-219-101.eu-west-2.compute.amazonaws.com:8443/test-front-end/customer.html you can use to try this API out.

#### 4) signupMechanic

##### Description

This works in a similar manner to ```/signup``` and has the same responses, but for mechanics. There is an extra, optional field "company".  

Example request : ```curl --data "firstname=Omotola&lastname=Babasola&email=omotola.babasola%40yahoo.com&password=abcdefg&company=Carmonic" https://ec2-35-177-219-101.eu-west-2.compute.amazonaws.com:8443/signupMechanic```.

There is a test sign up web form at https://ec2-35-177-219-101.eu-west-2.compute.amazonaws.com:8443/test-front-end/mechanic.html you can use to try this API out. 

#### 5) loginMechanic

##### Description

This works in a similar manner to ```/signup``` and has the same responses, but for mechanics. There is an extra, optional field "company".  

Example request: ```curl --data "email=omotola.babasola%40yahoo.com&password=abcdefgh" http://ec2-35-177-219-101.eu-west-2.compute.amazonaws.com:3000/login```.

There is a test sign up web form at https://ec2-35-177-219-101.eu-west-2.compute.amazonaws.com:8443/test-front-end/mechanic.html you can use to try this API out. 

### Websocket Events

For the mechanic:

1. On "connect" event, emit ```mechanic_register(mechanic)```

2. After login, every 60 seconds, emit ```mechanic_update_location(mechanic)```

3. Always listen for ```job_req(mechanic, customer)``` unless you’re currently on a job

4. If you receive ```job_req (mechanic, customer)``` show the popup where the mechanic can accept or reject the job

5. On click Accept, emit ```mechanic_accept_job(mechanic, customer)```

   1. Every 10 seconds, emit ```mechanic_update_location(mechanic, customer)```

   2. Every 10 seconds, call ```/getEstimatedDistance``` API to get how many minutes away the mechanic is

   3. When the mechanic is 1 min away, emit ```mechanic_start_job(mechanic, customer)``` *This one is up for debate. You can maybe show a button that the mechanic can use to start the job instead and then emit when the button is pressed

   4. When the mechanic presses the conclude button, transition to the billing page, where the mechanic can select what kind of job it was and select the amount of money the customer should pay, then emit ```mechanic_conclude_job(mechanic, customer, bill)```

6. On click Reject, emit ```mechanic_reject_job(mechanic, customer)```

See ```socket-io-logic.js``` for the technical details
