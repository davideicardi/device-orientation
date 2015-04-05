"use strict";

var reservedRooms = {}; // dictionary of  roomId, { id: roomId, screenSockets: [], remoteSocket: {...} }

function init(socketIO){
    socketIO.on('connection', function(socket){
    
        socket.on('initRoom', function (data) {
            if (!isRoomReserved(data.roomId)){
                // TODO handle error on client
                console.log('Room not reserved: ' + data.roomId);
                return;
            }
            
            socket.join(data.roomId);
            reservedRooms[data.roomId].screenSockets.push(socket);

            console.log('Room ready: ' + data.roomId);
            
            socket.on('disconnect', function(){
                var index = reservedRooms[data.roomId].screenSockets.indexOf(socket);
                if (index >= 0) {
                  reservedRooms[data.roomId].screenSockets.splice( index, 1 );
                }
                
                if (reservedRooms[data.roomId].screenSockets.length == 0){
                    reservedRooms[data.roomId] = null;
                    console.log('Room closed: ' + data.roomId);
                }
                else {
                    console.log('Room socket removed: ' + data.roomId);
                }
            });
        });
        
        
        socket.on('initRemote', function (initData) {
            
            if (!isRoomReserved(initData.roomId)){
                // TODO handle error on client
                console.log('Room not reserved: ' + initData.roomId);
                return;
            }

            var room = reservedRooms[initData.roomId];

            if (room.remoteSocket){
                // TODO handle error on client
                console.log('Room already has a remote: ' + room.id);
                return;
            }
            
            room.remoteSocket = socket;
            socketIO.to(room.id).emit('remote-connected', initData);
            console.log("Room remote connected: " + room.id + " " + initData);

            socket.on('remote-orientation', function (orientationData) {
                socketIO.to(room.id).emit('remote-orientation', orientationData);
            });
            
            socket.on('disconnect', function(){
                room.remoteSocket = null;
                socketIO.to(room.id).emit('remote-disconnected');
                console.log("Room remote disconnected: " + room.id);
            });
        });        
    });

}

function reserveRoom() {
    var i;
    for (i = 0; i < 100; i++){
        var roomId = "r" + i;
        
        if (!reservedRooms[roomId]){
            reservedRooms[roomId] = { id: roomId, screenSockets : [], remoteSocket : null };
            return roomId;
        }
    }
    
    throw "no more rooms available";
}

function isRoomReserved(roomId) {
    if (reservedRooms[roomId]){
        return true;
    }
    
    return false;
}

exports.init = init;
exports.reserveRoom = reserveRoom;
exports.isRoomReserved = isRoomReserved;
