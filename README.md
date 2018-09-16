# Carmonic

## Overview

This repo will serve as a beta back end for the Carmonic application. 

## Architecture

Currently the back end consists of a single Amazon EC2 instance, running a Node.js (ExpressJS) server and an Amazon RDS database running PostgreSQL. These can both be scaled up according to demand later on, but since we are currently in development stage, this setup should suffice.

Our host runs publicly at http://www.ec2-35-177-219-101.eu-west-2.compute.amazonaws.com:3000

## API Documentation

#### 1) getMechanics

![Alt text](statics/getMechanics.jpg?raw=true "getMechanics diagram")

##### Description

When logged in, a customer will request a mechanic based on their geographic location. The job of this API is to return the n closest mechanics to the front end app at their current location, regardless of the availability of the mechanic. That complexity will be handled later in the execution chain.

Example input: GET /getMechanics?longitude=-0.081018&latitude=51.652084

Example response: [{"username":"2","firstname":"Shegz","lat":51.652084,"lng":-0.081018},{"username":"1","firstname":"Ciroma","lat":51.517681,"lng":-0.08237}]


