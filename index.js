"use strict";

// Main nodejs entry point

// run "npm install" to install all dependencies
// see config.js for configuration

// Run server by using:
//  node ./index.js
// or to autorestarting it when something change use
//  nodemon ./index.js

var config = require("./config.js");

var express    = require("express");
var bodyParser = require('body-parser');
var app = express();


var http = require('http').Server(app);
var socketIO = require('socket.io')(http);


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/bower_components'));

// routes
require("./routes/api.js").init(app);
require("./routes/home.js").init(app);


http.listen(config.web.port, function(){
  console.log("device-orientation server running at port " + config.web.port + "...");
});



// test sockets implementation
socketIO.on('connection', function(socket){
  console.log('a user connected');

  socket.on('disconnect', function(){
    console.log('user disconnected');
  });

  socket.on('test-orientation', function (data) {
    socket.broadcast.emit('test-orientation', data);
  });
});
