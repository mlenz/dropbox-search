var express = require("express");
var http = require("http");
var url = require("url");
var fs = require("fs");
var dbox = require("dbox");
var solr = require("solr");
var querystring = require("querystring");

var host = process.env.SERVER_HOST || "";
var port = process.env.PORT || 8888;

function start() {
    var app = setup();
    
    app.get(/\/search$/, function(req, res) {    
        res.sendfile("web/search.html");
    });
    
    app.get(/\/*.gif$/, function(req, res) {
        res.sendfile("web" + req.url);
    });

    app.get(/\/find$/, function(req, res) {
        var query = url.parse(req.url, true).query;
        var text = query.q;

        // Solr search options
        var start = query.start || 0;
        var options = { "fl" : "title,id,path,when,icon,size,mime_type",
            "defType" : "edismax",
            "qf" : "title text",
            "hl" : "on",
            "hl.fl" : "*",
            "start" : start
        };
        text = formatSearchQuery(text);
        solr.createClient().query(text, options, function(err, reply) {
            if (err) {
                console.log(err);
                res.writeHead(500);
            } else {
                res.write(reply);
            }
            res.end();
        });
    });

    // Set up custom keywords
    function formatSearchQuery(text) {
        text = text.replace(/\bin:/g, "path:");
        text = text.replace(/\bby:/g, "author:");
        text = text.replace(/\btype:/g, "mime_type:");
        text = text.replace(/\bwhere:[a-zA-Z-]*\b/g, "gps_latitude:*"); // TODO
        text = text.replace(/\bwhen:today\b/g, "when:[NOW/DAY TO NOW]");
        text = text.replace(/\bwhen:yesterday\b/g, "when:[NOW-1DAY/DAY TO NOW/DAY]");
        // e.g. when:2013 or when:2012-01 or when:2011-10-08
        text = text.replace(/\bwhen:(\d\d\d\d-\d\d-\d\d)\b/g, "when:[$1T00:00:00Z TO $1T23:59:59Z]");
        text = text.replace(/\bwhen:(\d\d\d\d-\d\d)\b/g, "when:[$1-01T00:00:00Z TO $1-31T23:59:59Z]");
        text = text.replace(/\bwhen:(\d\d\d\d)\b/g, "when:[$1-01-01T00:00:00Z TO $1-12-31T23:59:59Z]");
        return text;
    }
    
    function setup() {
        var app = express();
        
        app.use(express.cookieParser());
        app.use(app.router);
    
        app.listen(port);
        console.log("Server started on port " + port);
        return app;
    }
}

start();
