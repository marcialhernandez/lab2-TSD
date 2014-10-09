var express = require('express')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io')(server); //

app.use("/html", express.static(__dirname + '/html'));

app.get('/', function(req, res){ 

  res.sendFile(__dirname + '/html/index.html'); 

});

io.on('connection', function(socket){
  socket.on('chat message', function(msg){
  io.emit('chat message', msg);
  console.log(msg);
  });
})

server.listen(3000, function(){
  console.log('listening on *:3000');
});

