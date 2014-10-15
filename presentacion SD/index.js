var express = require('express')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io')(server)//
  , nickNamesUsados = []
  , salas = []
  , cruceNickSala= {};

salas.push('salaPorDefecto');

app.use("/html", express.static(__dirname + '/html'));

app.get('/' || '/login', function(req, res){ 

  res.sendFile(__dirname + '/html/login.html'); 

});

io.on('connection', function(socket){
  socket.on('requestForLogin', function(usuarioNuevo){
    if (nickNamesUsados.indexOf(usuarioNuevo)==-1){ //retorna -1 si no esta, caso contrario retorna la posicion
      nickNamesUsados.push(usuarioNuevo);
      socket.emit('respondForLogin', 0); //0 significa que se ha logrado
      console.log('[System]: Ha ingresado '+ usuarioNuevo);
    }
    else{
      socket.emit('respondForLogin', 1); //1 significa que ya existe
    }
  })
})


io.on('connection', function(socket){
  socket.on('chat message', function(msg){
  io.emit('chat message', msg);
  console.log(msg);
  });
})

server.listen(3000, function(){
  console.log('listening on *:3000');
});