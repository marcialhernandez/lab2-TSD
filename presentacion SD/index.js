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
    inicio_sesion(socket);
  }); 

  //Esta función realiza el proceso de inicio de sesion de un cliente por parte del servidor
  function inicio_sesion(socket){
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

/*io.on('connection', function(socket){
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
*/

io.on('connection', function(socket){
  socket.on('chat message', function(msg){
  io.emit('chat message', msg);
  console.log(msg);
  });
})

server.listen(3000, function(){
  console.log('listening on *:3000');
});