var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io')(server)//
  , nickNamesUsados = []
  , salas = []
  , cruceNickSala= {};

salas.push('salaPorDefecto');

app.use("/views", express.static(__dirname + '/views'));

app.get('/', function(req, res){ 

  res.sendFile(__dirname + '/views/index.html'); 

});

  io.sockets.on('connection', function(socket){ //Cada vez que un usuario se conecte              
    inicioSesion(socket);
    chatGeneral(socket);
  }); 

  //Esta función realiza el proceso de inicio de sesion de un cliente por parte del servidor
  function inicioSesion(socket){
    socket.on('requestForLogin', function(data, callback){  
      if (nickNamesUsados.indexOf(data) != -1 ){ // Si el nick ya existe se envia false al cliente
        callback(false);
      }
      // Si no
      else{
        //id_room = null;
        //enviamos true al cliente
        callback(true);
        // Guardamos el nick del usuario, para luego poder mostrarlo
        socket.nickname = data;
        // Agregamos al usuario al arreglo de conectados
        nickNamesUsados.push(socket.nickname);       
        //enviamos el areglo actualizado de usuarios conectados
        //updateConectados();
      }
    });
  }

function chatGeneral(socket){
  socket.on('sendingGeneralMessage', function(msg){
    msg='['+socket.nickname+']:'+msg;
  io.emit('receivingGeneralMessage', msg);
  console.log(msg);
  });
}

server.listen(3000, function(){
  console.log('listening on *:3000');
});