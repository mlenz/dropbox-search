/*
github.com/mlenz/dropbox-search
Simple node server for search page. Sends search requests to solr instance and return the
resulting json to the client for display. Examples solr instance to be customized to 
return certain fields (see schema.xml). Further extends queries to define custom
field names such as 'where' and 'when'.
Uses the Solr eDisMax parser for rich handling of user input.
*/

var express = require("express");
var url = require("url");
var solr = require("solr");

var host = process.env.SERVER_HOST || "";
var port = process.env.PORT || 8888;

function start() {
    var app = setup();
    
    app.get(/\/search$/, function(req, res) {    
        res.sendfile("web/search.html");
    });
    
    app.get(/.(gif|js)$/, function(req, res) {
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
            "start" : start,
            host : process.env.SOLR_HOST,
            port : process.env.SOLR_PORT
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
        // TODO quote " must be escaped
        text = text.replace(/\bwhere:([0-9'"\.-]+)\b/g, "gps_latitude:$1* OR gps_longitude:$1*");
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
