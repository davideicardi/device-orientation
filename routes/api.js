"use strict";

var rooms = require("./../rooms.js");

function findAndReserveRoom(req, res) {
    var roomId = rooms.findAvailableRoom();
    rooms.reserveRoom(roomId);
    
    res.json({roomId: roomId});
}

function getRooms(req, res) {
    res.json({count: rooms.getReservedRooms()});
}

function init(app){
    app.get('/api/rooms', getRooms);
    app.put('/api/reserveRoom', findAndReserveRoom);
};

exports.init = init;