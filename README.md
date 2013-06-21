Dropbox Search
--------------

Index and search the contents of your documents stored in Dropbox.  Written in node.js, requires Solr,
supports many document types and keyword shortcuts, and updates index as you add or edit files.
Bundled with a simple web front end with snippets and ajax loading of results.

### Examples

<table>
<tr><td>recipe</td><td>Search for text (case and stemming aware)</td></tr>
<tr><td>jam recipe in:Files</td><td>Match documents within a folder</td></tr>
<tr><td>when:yesterday</td><td>All documents modified yesterday</td></tr>
<tr><td>recipe when:2012</td><td>Matches from year 2012</td></tr>
<tr><td>by:Mike</td><td>Match the given author</td></tr>
<tr><td>dogs type:image</td><td>Return only images</td></tr>
<tr><td>where:40"47'3.509903</td><td>Match a lat/long in image metadata</td></tr>
</table>

![Search screenshot](/web/screenshot.png)

### Installation

1. Get a Dropbox API key.
2. Set up and run your Solr instance.
3. Edit environment variables as below.
4. `npm install` to download dependencies (solr, dbox, express, dateformat).
5. `node indexer.js` to index your documents.
6. `node server.js` to launch the web app.
7. Browse to `http://localhost:8888/search.html`

### Environment Variables

    DROPBOX_APP_KEY =
    DROPBOX_APP_SECRET =
    DROPBOX_UID =
    DROPBOX_OAUTH_TOKEN =
    DROPBOX_OAUTH_SECRET =
    SOLR_HOST = 127.0.0.1
    SOLR_PORT = 8983
    ROOT_PATH = /

_Pending_: the code doesn't yet implement the oauth protocol, so you must do this manually and provide token and secret for now.

### Indexing

Dropbox-search uses ExtractingRequestHandler to index multiple file types, including: **pdf**, **doc** and **dox** (Word),
**xls** (Excel), **ppt**, **odt**, **cxv**, **txt**, and more.  In addition to text content, it extracts metadata
such as **author** and **date**. For image files, it extracts exif metadata like **gps_latitude**.

I also define some useful shortcuts like:

* **when** : matches a date (e.g. _today_, _yesterday_, _year-mm-dd_, _year-mm_, or _year_)
* **type** : matches a file type (e.g. _image_ or _rtf_)
* **in** : matches files within the given folder or path fragment (e.g. _myfiles_)
* **by** : same as author

The indexer listens for Dropbox API **delta** events to get documents that need to be added or removed from the index.

_Note_: Dropbox may rate-limit excessive file fetches by returning 503 errors.

File type icons &copy; Dropbox Icon Library.
