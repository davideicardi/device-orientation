"use strict";

var roomCount = 0;
function reserveRoom(req, res) {
    
    roomCount++;
    
    res.json({roomId: roomCount});
    
}

function init(app){
    app.get('/api/reserveRoom', reserveRoom);
};

exports.init = init;