var solr = require("solr");
var dbox = require("dbox");
var querystring = require("querystring");
var dateFormat = require("dateformat");

var dbox = dbox.app({
    "app_key" : process.env.DROPBOX_APP_KEY,
    "app_secret": process.env.DROPBOX_APP_SECRET,
    "root": "dropbox"
});
var login_token = {
    uid : process.env.DROPBOX_UID,
    oauth_token: process.env.DROPBOX_OAUTH_TOKEN,
    oauth_token_secret: process.env.DROPBOX_OAUTH_SECRET
};

var solrClient = solr.createClient();
var fileQueue = [];
var rootPath = process.env.ROOT_PATH;

// Sample list of directory names to ignore
var ignoreDirs = [".git", "projectdata", "pkginfo", ".plist"];
var binaryFormats = /\.(jpg|jpeg|png|tiff|tif|bmp|mov|bin)$/i;
var deltaCursor = null;

// fire delta calls to download file metadata

function processFiles(dboxClient, dir) {
    dboxClient.delta({cursor : deltaCursor}, function(status, reply) {
        if (status != 200) {
            console.log("Delta status: " + status + " : " + JSON.stringify(reply));
            return;
        }
        if (reply.cursor) {
            deltaCursor = reply.cursor;
        }
        var len = reply.entries ? reply.entries.length : 0;
        dir = dir.toLowerCase();
        for (var i = 0; i < len; i++) {
            // verify delta path is within our target dir
            var entry = reply.entries[i];
            if (entry[0].indexOf(dir) === 0 && !ignore(entry[0])) {
                if (!entry[1]) {
                    deleteFile(entry[0]);
                }
                else if (!entry[1].is_dir) {
                    fileQueue.push(entry);	// to reduce rate-limiting 503 errors from dropbox
                }
            }
        }
    });
}

function ignore(path) {
    for (var i = 0; i < ignoreDirs.length; i++) {
        if (path.indexOf(ignoreDirs[i]) >= 0) {
            return true;
        }
    }
    return false;
}

function indexFile(client, path, file) {
    client.get(path, function(status, reply, metadata) {
        if (!reply || status != 200) {
            console.log("File status: " + status + " for: " + path);
            return;
        }
        // strip leading directories and extension from path
        var title = file.path.replace(/.*\/([^\/\.]*)\.?.*/, "$1");
        var query = querystring.stringify({
            "literal.id": path,     // note path is lowercased by delta api
            "literal.title": title,
            "literal.rev": file.rev,
            "literal.when": dateFormat(file.client_mtime, "isoDateTime") + "Z",
            "literal.path": file.path,
            "literal.icon": file.icon,
            "literal.size": file.bytes,
            "literal.mime_type": file.mime_type,
            "commit": true
        });
        if (file.path.match(binaryFormats)) {
            reply = ""; // don't upload image and other bin files
        }
        var options = {
            method: "POST",
            path: "/solr/update/extract?" + query,
            headers: {
                "Content-Length": reply.length
            },
            host: process.env.SOLR_HOST,
            port: process.env.SOLR_PORT,
            data: reply
        };
        solrClient.request(options, function(err) {
            if (err) console.log(err);
        });
    });
}

function deleteFile(path) {
    solrClient.del(path, null, function(err) {
        if (err) console.log(err);
        solrClient.commit();
    });
}

function dequeueFile(client) {
	if (fileQueue.length > 0) {
		var entry = fileQueue.shift();
		indexFile(client, entry[0], entry[1]);
	}
}

// Main loop

var dboxClient = dbox.client(login_token);

setInterval(function() { dequeueFile(dboxClient) }, 1000);

processFiles(dboxClient, rootPath);

setInterval(function() {
    processFiles(dboxClient, rootPath);
}, 60 * 1000);
