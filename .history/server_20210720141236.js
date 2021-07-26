
let PORT = 6010;    // ポートが競合する場合は値を変更すればOK

let http = require('http');
let fs   = require('fs');
let path = require('path');
let socketio = require('socket.io');

let mime = {
    // 必要に応じてMIMEタイプを追加する
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript"
};

let server = http.createServer(function(request, response) {

    let filePath = (request.url == '/')? '/index.html' : request.url;
    let fullPath = __dirname + filePath;

    response.writeHead(200, {'Content-Type' : mime[path.extname(fullPath)] || "text/plain"});
    fs.readFile(fullPath, function(err, data) {
        if(!err) {
            response.end(data, 'UTF-8');
        }
    })

}).listen(PORT);

let io = socketio.listen(server);

io.sockets.on('connection', function(socket) {
    socket.on('client_to_server', function(data) {
        io.sockets.emit('server_to_client', {value : data.value});
    });
});

console.log("Server started at port: " + PORT);