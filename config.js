"use strict";

var config = {};
config.web = {};

// nodejs server listening port
config.web.port = process.env.PORT || process.env.WEB_PORT || 8181;
config.web.ip = process.env.IP;

module.exports = config;