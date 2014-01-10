/*
github.com/mlenz/dropbox-search
Dropbox search page and client javascript to post searches to Solr,
parse json results, highlight matches inline, support ajax scrolling
of results, and support ajax history back/forward actions.
*/
(function() {
    var resultCount = 0;
    var nextResult = 0;
    
    $("#searchText").keyup(function(event) {
        if (event.keyCode == 13) {
            newSearch($(event.target).attr("value"));
        }
    });
    $("#searchText").select();
    $("#search").click(function() { newSearch($("#searchText").attr("value")) });
    $("#more").click(showMore);
    
    function doSearch(text, start) {
        jQuery.ajax( {
            url: "/find?q=" + encodeURIComponent(text) + "&start=" + start,
            dataType: "json",
            async: false,
            success: function(data) {
                showResults(data);
            },
            error: function(err) {
                $("#results").html("").append("<dt>No results found (invalid search).</dt><dd>" + JSON.stringify(err) + "</dd>");
            }
        } );
    }
    
    function newSearch(text) {
        doSearch(text, 0);
    
        history.pushState({text : text}, null, "?q=" + encodeURIComponent(text));
    }
    
    window.onpopstate = function(event) {
        var text = event.state ? event.state.text : (window.location.search.indexOf('?q=') === 0 ? decodeURIComponent(window.location.search.substring(3)) : "");
        $("#searchText").attr("value", text);
        if (text) {
            doSearch(text, 0); // don't call pushState
            $("#searchText").select();
        } else {
            $("#results").html("");
        }
    };
    
    function showResults(results) {
        resultCount = results.response.numFound;
        nextResult = results.response.start + 10;
        var resultsDiv = $("#results");
        
        if (resultCount > nextResult) {
            $("#count").html(resultCount - nextResult);
            $("#more").show();
        } else {
            $("#more").hide();
        }
        
        if (results.response.start === 0) {
            resultsDiv.html("");
        }
        if (resultCount === 0) {
            resultsDiv.append("<dt>No results found.</dt>");
        }
        var scrollPos = resultsDiv.offset().top + resultsDiv.height();
        if (scrollPos > $("body").scrollTop()) {
            $("body").animate({ scrollTop: scrollPos }, 600);
        }
        
        for (var doc in results.response.docs) {
            var result = results.response.docs[doc];
            var hilight = results.highlighting[result.id];
            var title;
            if (result.title) { // title array may have blank elements so skip those
                for (var i = 0; i < result.title.length; i++) {
                    if (result.title[i] && result.title[i].trim()) {
                        title = result.title[i];
                        break;
                    }
                }
            }
            else {
                title = result.path;
            }
            var icon = "<img src='/icons/" + result.icon + ".gif' class='icon'>";
            resultsDiv.append("<dt><a href='/file" + result.path + "'>" + icon + title + "</a></dt>");
            resultsDiv.append("<dd class='path'>" + formatPath(result.path) + "</dd>");
            var snippet = "<dd>" + formatDate(result.when);
            for (var h in hilight) {
                snippet +=  " &mdash; " + hilight[h][0] + "</dd>";
                break; // show first only
            }
            resultsDiv.append(snippet);
        }
    }
    
    function showMore() {
        doSearch($("#searchText").attr("value"), nextResult);
    }
    
    function formatPath(path) {
        return (path.lastIndexOf("/") === 0 || path.length <= 1) ? path : path.substring(1);
    }
    
    function formatDate(date) {
        var dd = new Date(date);
        return "<span class='date'>" + months[dd.getMonth()] + " " + dd.getDate() + ", " + dd.getFullYear() + "</span>";
    }
    
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
})();
