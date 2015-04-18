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
            
    if (!this.reserved){
        // TODO handle error on client
        socket.emit("room-error", "Room not reserved");
        return;
    }

    if (this.isConnectedRemoteDevice()){
        // TODO handle error on client
        socket.emit("room-error", "Room already connected to another remote");
        return;
    }

    this.remote = { socket : socket, data: data };
    
    var currentRoom = this;
    
    socket.on('remote-orientation', function (orientationData) {
        _socketIO.to(currentRoom.id).emit('remote-orientation', orientationData);
    });
    
    this.notifyIfRemoteIsConnected();
    
    socket.on('disconnect', function(){
        currentRoom.disconnectRemoteDevice();
    });
};

Room.prototype.notifyIfRemoteIsConnected = function(){
    if (this.remote){
        console.log("Room remote connected: " + this.id);
        
        _socketIO.to(this.id).emit('remote-connected', this.remote.data);
        this.remote.socket.emit("room-connected", {});
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

Room.prototype.open = function() {
    if (this.reserved){
        throw "Room already reserved";
    }
    
    console.log('Opening room ' + this.id);
    
    this.reserved = true;
};

Room.prototype.close = function() {
    console.log('Closing room ' + this.id);
    
    this.reserved = false;

    if (this.remote){
        this.remote.socket.emit("room-disconnected", {});
    }
};

Room.prototype.addScreen = function(socket) {
    console.log('Adding screen to room ' + this.id);

    _reservedRooms[this.id].screenSockets.push(socket);
    socket.join(this.id);

    this.notifyIfRemoteIsConnected();
    
    var currentRoom = this;
    socket.on('disconnect', function(){
        currentRoom.removeScreen(socket);
    });
};

Room.prototype.removeScreen = function(socket) {
    console.log('Removing screen from room ' + this.id);

    var index = this.screenSockets.indexOf(socket);
    if (index >= 0) {
      this.screenSockets.splice( index, 1 );
    }
    
    if (this.screenSockets.length == 0){
        this.close();
    }
};


function init(socketIO){
    
    // create rooms
    var i;
    for (i = 0; i < MAX_ROOMS; i++) {
        _reservedRooms[i] = new Room(i);
    }
    
    
    _socketIO = socketIO;
    _socketIO.on('connection', function(socket){
    
        socket.on('initRoom', function (data) {
            var room = getRoom(data.roomId);

            if (!room.reserved){
                room.open();
            }

            room.addScreen(socket);
        });
        
        socket.on('initRemote', function (initData) {
            var room = getRoom(initData.roomId);

            room.connectRemoteDevice(socket, initData);
        });        
    });

}

function reserveRoom(roomId) {
    var room = getRoom(roomId);

    room.open();
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
