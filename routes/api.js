"use strict";

var rooms = require("./../rooms.js");

function reserveRoom(req, res) {
    
    res.json({roomId: rooms.reserveRoom()});
    
}

function init(app){
    app.get('/api/reserveRoom', reserveRoom);
};

exports.init = init;