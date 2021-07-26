const httpServer = require("http").createServer();
const io = require("socket.io")(httpServer, {
  // ...
});

io.on("connection", (socket) => {
    client.on('event', data => { /* … */ });
    client.on('disconnect', () => { /* … */ });
});

httpServer.listen(3000);