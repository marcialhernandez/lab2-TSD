var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io')(server)//
  , nickNamesUsados = []
  , nickSocket={} //diccionario que tiene los nombre:socket
  , salas = [] //salas
  //cada sala tiene un nombre asociado a una lista de usuarios activos
  ,mensajeAEnviar
  , mensajeDeVuelta;

salas.push('porDefecto'); //sala por defecto

app.use("/views", express.static(__dirname + '/views'));

app.get('/', function(req, res){ 

  res.sendFile(__dirname + '/views/index.html'); 

});

  io.sockets.on('connection', function(socket){ //Cada vez que un usuario se conecte              
    usuariosConectados();
    salasActivas();
    inicioSesion(socket);
    chatGeneral(socket);
    chatPrivado(socket);
    cambioDeSala(socket);
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
        //se crea un buzon para el nickName creado
        nickSocket[socket.nickname]=socket;
        // Agregamos al usuario al arreglo de conectados
        nickNamesUsados.push(socket.nickname);
        socket.join(salas[0]); //se ingresa a la sala por defecto
        socket.salaActual=salas[0]; //se crea un atributo salaActual al socket y se asocia su sala actual a este atributo
        usuariosConectados(); //se actualizan los usuarios conectados
        salasActivas(); //se actualizan las salas activas
        //enviamos el arreglo actualizado de usuarios conectados
        //updateConectados();
      }
    });
  }

function chatGeneral(socket){
  socket.on('sendingGeneralMessage', function(msg){
    msg='['+socket.nickname+']:'+msg;
  io.to(socket.salaActual).emit('receivingGeneralMessage', msg);
  console.log(msg+' (MensajeNormal)');
  });
}

function chatPrivado(socket){
  socket.on('sendingPrivateMessage', function(msg){
    console.log(msg.join('|')+' (MensajePrivado)');
    if (nickNamesUsados.indexOf(msg[0]) != -1 ){ // Si el nick existe, se puede enviar el mensaje
        mensajeAEnviar='[From '+socket.nickname+']: '+msg[1];
        mensajeDeVuelta='[To '+msg[0]+']: '+msg[1];
        nickSocket[msg[0]].emit('returnMensajePrivado', mensajeAEnviar);
        nickSocket[socket.nickname].emit('returnMensajePrivado', mensajeDeVuelta);
      }
    else{ //caso contrario, se envia un mensaje privado al emisor, avisando que no existe usuario
        mensajeAEnviar='[System]: No existe el usuario';
        nickSocket[socket.nickname].emit('returnMensajePrivado', mensajeAEnviar);
    }
  });
}

function usuariosConectados(){
    io.sockets.emit('usuariosConectados', nickNamesUsados);
  }

function cambioDeSala(socket){
    socket.on('requestForSala', function(data){ 
    if (salas.indexOf(data) == -1 ){ //Si la sala no existe
      //Se crea una nueva, se asigna al socket actual y se anuncia
      salas.push(String(data));
      console.log(socket.nickname+' ha salido de la sala '+socket.salaActual);
      //Se anuncia en la sala actual que ha salido de la sala
      mensajeAEnviar=socket.nickname+' ha salido de la sala '+socket.salaActual;
      io.to(socket.salaActual).emit('receivingGeneralMessage', mensajeAEnviar);
      //salgo de la sala actual
      socket.leave(socket.salaActual);
      //asocio la nueva sala
      socket.salaActual=data;
      console.log(socket.nickname+' ha ingresado a la sala '+socket.salaActual);
      //ingreso a la nueva sala
      socket.join(data);
      //mensaje a todos los conectados
      mensajeAEnviar=socket.nickname+' ha creado la sala '+data;
      io.sockets.emit('receivingGeneralMessage', mensajeAEnviar);
      mensajeAEnviar=socket.nickname+' ha ingresado a la sala';
      io.to(socket.salaActual).emit('receivingGeneralMessage', mensajeAEnviar);
    }

    else{
      //Se anuncia en la sala actual que ha salido de la sala
      mensajeAEnviar=socket.nickname+' ha salido de la sala';
      console.log(socket.nickname+' ha salido de la sala '+socket.salaActual);

       //salgo de la sala actual
      socket.leave(socket.salaActual);
      //asocio la nueva sala
      socket.salaActual=data;
      //ingreso a la nueva sala
      socket.join(data);
      console.log(socket.nickname+' ha ingresado a la sala '+socket.salaActual);

      //envio un mensaje a todos los conectados en la sala actual
      mensajeAEnviar=socket.nickname+' ha ingresado a la sala';
      io.to(socket.salaActual).emit('receivingGeneralMessage', mensajeAEnviar);
    } 

    salasActivas();

    });
  }

function salasActivas(){
    io.sockets.emit('salasActivas', salas);
  }

server.listen(3000, function(){
  console.log('listening on *:3000');
});