"use strict";

var MAX_ROOMS = 100;
var _reservedRooms = {}; // dictionary of  roomId, { id: roomId, screenSockets: [], remoteSocket: {...} }
var _socketIO;

function Room(id) {
    this.id = id;
    this.screenSockets = [];
    this.remoteSocket = null;
    this.reserved = false;
    
    return this;
}

Room.prototype.connectRemoteDevice = function(socket, data){
    if (this.isConnectedRemoteDevice()){
        throw "Already connected";
    }

    this.remote = { socket : socket, data: data };
    this.notifyIfRemoteIsConnected();
};

Room.prototype.notifyIfRemoteIsConnected = function(){
    if (this.remote){
        _socketIO.to(this.id).emit('remote-connected', this.remote.data);
        console.log("Room remote connected: " + this.id);
    }
};

Room.prototype.disconnectRemoteDevice = function(){
    this.remote = null;

    _socketIO.to(this.id).emit('remote-disconnected');
    console.log("Room remote disconnected: " + this.id);
};

Room.prototype.isConnectedRemoteDevice = function(){
    return !!(this.remote);
};


// init rooms
var i;
for (i = 0; i < MAX_ROOMS; i++) {
    _reservedRooms[i] = new Room(i);
}

function init(socketIO){
    _socketIO = socketIO;
    _socketIO.on('connection', function(socket){
    
        socket.on('initRoom', function (data) {
            var room = getRoom(data.roomId);

            if (!room.reserved){
                reserveRoom(room.id);
            }

            socket.join(room.id);
            _reservedRooms[room.id].screenSockets.push(socket);

            console.log('Room ready: ' + room.id);
            
            room.notifyIfRemoteIsConnected();
            
            socket.on('disconnect', function(){
                var index = room.screenSockets.indexOf(socket);
                if (index >= 0) {
                  room.screenSockets.splice( index, 1 );
                }
                
                if (room.screenSockets.length == 0){
                    unreserveRoom(room.id);
                    console.log('Room closed: ' + room.id);
                }
                else {
                    console.log('Room socket removed: ' + room.id);
                }
            });
        });
        
        socket.on('initRemote', function (initData) {

            var room = getRoom(initData.roomId);
            
            if (!isRoomReserved(initData.roomId)){
                // TODO handle error on client
                console.log('Room not reserved: ' + initData.roomId);
                return;
            }

            if (room.isConnectedRemoteDevice()){
                // TODO handle error on client
                console.log('Room already has a remote: ' + room.id);
                return;
            }
            
            room.connectRemoteDevice(socket, initData);

            socket.on('remote-orientation', function (orientationData) {
                socketIO.to(room.id).emit('remote-orientation', orientationData);
            });
            
            socket.on('disconnect', function(){
                room.disconnectRemoteDevice();
            });
        });        
    });

}

function reserveRoom(roomId) {
    
    var room = getRoom(roomId);

    if (room.reserved){
        throw "Room already reserved";
    }
    
    room.reserved = true;
}

function unreserveRoom(roomId) {
    var room = getRoom(roomId);

    room.reserved = false;
}

function findAvailableRoom() {
    var i;
    for (i = 0; i < MAX_ROOMS; i++){
        if (_reservedRooms[i].reserved == false){
            return i;
        }
    }
    
    throw "no more rooms available";
}

function isRoomReserved(roomId) {
    var room = getRoom(roomId);
    
    return room.reserved;
}

function getRoom(roomId) {
    if (!_reservedRooms[roomId]){
        throw "Invalid room id";
    }
    
    return _reservedRooms[roomId];
}

function getReservedRooms() {
    var i;
    for (i = 0; i < MAX_ROOMS; i++){
        if (!isRoomReserved(i)){
            return i;
        }
    }
    
    return MAX_ROOMS;
}

exports.init = init;
exports.reserveRoom = reserveRoom;
exports.findAvailableRoom = findAvailableRoom;
exports.isRoomReserved = isRoomReserved;
exports.getReservedRooms = getReservedRooms;
