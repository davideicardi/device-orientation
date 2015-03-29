"use strict";

var path = require("path");

function home(req, res) {
    res.sendFile("home.html", { root: path.join(__dirname, '../views') });
}


function init(app){
    app.get('/', home);
};

exports.init = init;