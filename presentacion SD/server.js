var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io')(server)//
  , nickNamesUsados = []
  , salas = [] //lista de salas, cada sala es de tipo sala, que contiene su nombre, posicionRaton,jugadores y el turno actual
  , salasTablero={} //diccionario que tiene nombreSala:Tablero
  , salasPosicion={} //diccionario que tiene nombreSala:posicionListaDeSalas
  , nickSocket={} //diccionario que tiene los nombre:socket
  //cada sala tiene un nombre asociado a una lista de usuarios activos
  , mensajeAEnviar
  , mensajeDeVuelta;

agregarSala('porDefecto',salas, salasPosicion);
asignarTablero(salasTablero, salas[0].nombre);//Asigno tablero en la sala por defecto

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
    //infoUsuario(socket); al inicio no hay nadie
    requestForInfoUsuarios(socket);
    //tableroSalaActual(socket); No es necesario cargar el tablero al inicio
    requestForUp(socket);

  }); 

  //-------------------------------------------------------------------------

  function sala(nombre) {
    this.nombre = nombre; //string, nombre de la sala
    this.posicionRaton=[0,0]; //[x,y] con x = Fila e y =Columna numeros enteros, al principio siempre esta en esta posicion
    this.jugadores=[]; //lista con los jugadores
    this.turnoActual=''; //nick del jugador que le toca jugar
  }

  sala.prototype = { //funcion propia del tipo sala
    agregarJugador: function(nombreJugador) {
        this.jugadores.push(nombreJugador);
    }
  };

  /* no funciona investigar
    sala.prototype = { //funcion propia del tipo sala
    ratonY: function() {
        return this.posicionRaton[0];
    }
  };*/

  //agrega una sala con un nombre dado a la lista de salas
  function agregarSala(nombreSalaNueva,listaDeSalas,diccionarioPosSalas){
    var nuevaSala = new sala(nombreSalaNueva);
    diccionarioPosSalas[nombreSalaNueva+'']=listaDeSalas.length;
    /*diccionarioPosSalas.push({
    nombreSalaNueva: listaDeSalas.length
    });*/
    //La logica es simple, antes de agregar a la cola de salas la nueva sala, guardo el tamanio total de la lista
    //como atributo, pues se cumple que tamanio total lista-1 = ultimo elemento lista 
    listaDeSalas.push(nuevaSala);
  }

  /*sala.prototype = { por implementar
    quitarJugador: function(nombreJugador) {
        this.jugadores.push(nombreJugador);
    }
  };*/

  //-------------------------------------------------------------------------

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
        socket.join(salas[0].nombre); //se ingresa a la sala por defecto
        socket.salaActual=salas[0].nombre; //se crea un atributo salaActual al socket y se asocia su sala actual a este atributo

        console.log('jugador: '+socket.nickname+' esta en el siguiente tablero');
        console.log(salasTablero[socket.salaActual]); //Test! muestro el tablero de la sala actual
        usuariosConectados(); //se actualizan los usuarios conectados
        salasActivas(); //se actualizan las salas activas
        infoUsuario(socket); //se actualiza la informacion del usuario
        tableroSalaActual(socket); //se actualiza el tablero una vez ya esta logeado
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
        //console.log('sala del usuario destino:'+nickSocket[msg[0]].salaActual); con esto se obtiene la sala del usuario destino
        mensajeDeVuelta='[To '+msg[0]+']: '+msg[1];
        nickSocket[msg[0]].emit('returnMensajePrivado', mensajeAEnviar);
        socket.emit('returnMensajePrivado', mensajeDeVuelta);
      }
    else{ //caso contrario, se envia un mensaje privado al emisor, avisando que no existe usuario
        mensajeAEnviar='[System]: No existe el usuario';
        socket.emit('returnMensajePrivado', mensajeAEnviar);
    }
  });
}

function requestForInfoUsuarios(socket){
    socket.on('requestForInfoUsuarios', function(msg){
    var infoUsuarios = [];
    for (clave in nickSocket) {
      infoUsuarios.push(nickSocket[clave].nickname+' en '+nickSocket[clave].salaActual);
    }
    socket.emit('usuariosConectados', infoUsuarios);
  })
}


function usuariosConectados(){
    io.sockets.emit('usuariosConectados', nickNamesUsados);
  }

function infoUsuario(socket){
  var infoPersonal=[];
  infoPersonal.push(socket.nickname);
  infoPersonal.push(socket.salaActual);
    nickSocket[socket.nickname].emit('infoUsuario', infoPersonal);
  }

function cambioDeSala(socket){
    socket.on('requestForSala', function(data){ 
      var siEsta=false;
      for (var i=0;i<salas.length;i++){
        if(String(salas[i].nombre).localeCompare(String(data))==0){
          siEsta=true;
          break;
        }
      }

    if (siEsta==false ){ //Si la sala no existe
      //Se crea una nueva, se asigna al socket actual y se anuncia
      agregarSala(data,salas,salasPosicion);
      //salas.push(data);
      console.log(socket.nickname+' ha salido de la sala '+socket.salaActual);
      //Se anuncia en la sala actual que ha salido de la sala
      mensajeAEnviar=socket.nickname+' ha salido de la sala '+socket.salaActual;
      io.to(socket.salaActual).emit('receivingGeneralMessage', mensajeAEnviar);
      //salgo de la sala actual
      socket.leave(socket.salaActual);
      //asocio la nueva sala
      socket.salaActual=data;
      asignarTablero(salasTablero, socket.salaActual); //asigno un tablero nuevo a la sala recien creada
      console.log(socket.nickname+' ha ingresado a la sala '+socket.salaActual);
      //ingreso a la nueva sala
      socket.join(data);
      //mensaje a todos los conectados
      mensajeAEnviar=socket.nickname+' ha creado la sala '+data;
      io.sockets.emit('receivingGeneralMessage', mensajeAEnviar);
      mensajeAEnviar=socket.nickname+' ha ingresado a la sala';
      io.to(socket.salaActual).emit('receivingGeneralMessage', mensajeAEnviar);
      //se actualizan las salas activas
      salasActivas();
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
    console.log('jugador: '+socket.nickname+' esta en el siguiente tablero');
    console.log(salasTablero[socket.salaActual]); //Test! muestro el tablero de la sala actual
    usuariosConectados(); //se actualiza la lista de conectados, para resetear en caso de que @ver este activo
    infoUsuario(socket); //se actualiza la informacion del usuario
    tableroSalaActual(socket); //se actualiza el tablero actual

    });
  }

function salasActivas(){
    var nombreSalas=[];
    for (var i=0;i<salas.length;i++){
      nombreSalas.push(salas[i].nombre);
    }
    io.sockets.emit('salasActivas', nombreSalas);
  }

//Emito la matriz que esta asociada a la sala que esta asociada al socket actual
function tableroSalaActual(socket){
    socket.emit('tableroSalaActual', salasTablero[socket.salaActual]);
  }

/*-------------------------------------------------------------------------
/*------------------Funciones respecto al juego--------------------------*/

function asignarTablero(diccionarioSalas, nombreSala){
  diccionarioSalas[nombreSala]=inicializaTablero(); //inicializo un tablero en la sala de entrada
}

function inicializaTablero(){
  var tablero = [];
  for(var i=0; i<10; i++) {
    tablero[i] = [];
    for(var j=0; j<10; j++) {
        tablero[i][j] = 'O'; //no hay nada (o mayuscula)
    }
  }

  //Se agregan 7 trampas al inicio
  for (var i=0;i<7;i++){
    //Math.floor(Math.random() * 9) = numero aleatorio entre 0 y 9
    tablero[getRandomInt(0, 9)][getRandomInt(0, 9)]='T'// T de trampa
  }

  //Se agrega la salida, alejada del inicio , con 6 celdas de lejania tanto de forma horizontal como vertical
  //Si es necesario sobreEscribe una trampa
  tablero [getRandomInt(6, 9)][getRandomInt(6, 9)]='S';

  //Al final se agrega al raton al inicio
  tablero[0][0]='@' //raton

  return tablero;

}//Fin funcion inicializarTablero

//http://stackoverflow.com/questions/1527803/generating-random-numbers-in-javascript-in-a-specific-range
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

//salas = []
//salasPosicion={}

function requestForUp(socket){
    socket.on('requestForUp', function(callback){  
      //Si la fila del raton de la sala actual que se contiene en la lista de salas es 0
      //console.log('la posicion de la sala:'+socket.salaActual+' es '+salasPosicion[socket.salaActual]); Test
      //console.log(salas[salasPosicion[socket.salaActual]].posicionRaton[0]); Test
      if (salas[salasPosicion[socket.salaActual]].posicionRaton[0]==0){
        //console.log('movimiento invalido!!');
        callback(false);
      }
      // Si no
      else{

        callback(true);
        }
       /* //id_room = null;
        //enviamos true al cliente
        // Guardamos el nick del usuario, para luego poder mostrarlo
        socket.nickname = data;
        //se crea un buzon para el nickName creado
        nickSocket[socket.nickname]=socket;
        // Agregamos al usuario al arreglo de conectados
        nickNamesUsados.push(socket.nickname);
        socket.join(salas[0].nombre); //se ingresa a la sala por defecto
        socket.salaActual=salas[0].nombre; //se crea un atributo salaActual al socket y se asocia su sala actual a este atributo
        console.log('jugador: '+socket.nickname+' esta en el siguiente tablero');
        console.log(salasTablero[socket.salaActual]); //Test! muestro el tablero de la sala actual
        usuariosConectados(); //se actualizan los usuarios conectados
        salasActivas(); //se actualizan las salas activas
        infoUsuario(socket); //se actualiza la informacion del usuario
        tableroSalaActual(socket); //se actualiza el tablero una vez ya esta logeado*/
      
    });
  }

/*-------------------------------------------------------------------------*/

server.listen(3000, function(){
  console.log('listening on *:3000');
});