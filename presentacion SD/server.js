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
  , salasPorDefecto=[] //lista de salas por defecto que se iran acumulando por cada 4 jugadores ingresados
  //cada sala tiene un nombre asociado a una lista de usuarios activos
  , mensajeAEnviar
  , mensajeDeVuelta;

salasPorDefecto.push('salaPorDefecto_'+salasPorDefecto.length)
agregarSala(salasPorDefecto[salasPorDefecto.length-1],salas, salasPosicion); //siempre uso el de la ultima posicion

app.use("/views", express.static(__dirname + '/views'));

app.get('/', function(req, res){ 

  res.sendFile(__dirname + '/views/index.html'); 

});

//Conjunto de servicios activos, esperando emisiones de la vista
  io.sockets.on('connection', function(socket){
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
    requestForDown(socket);
    requestForRight(socket);
    requestForLeft(socket);
    usuarioDesconectado(socket);
  }); 

  server.listen(3000, function(){
  console.log('listening on *:3000');
});

  //-------------------------------------------------------------------------

//Constructor que crea un objeto tipo sala
  function sala(nombre) {
    this.nombre = nombre; //string, nombre de la sala
    this.posicionRaton=[0,0]; //[x,y] con x = Fila e y =Columna numeros enteros, al principio siempre esta en esta posicion
    this.jugadores=[]; //lista con los jugadores
    this.turnoActual=''; //nick del jugador que le toca jugar
    this.posicionRatonAnterior='O'; //guarda la pos anterior, antes de haber pisado la casilla actual
    this.puntaje=10000; //cada sala tiene un puntaje inicial de 10000
  }

  sala.prototype = { //funcion propia del tipo sala, agrega jugadores
    agregarJugador: function(nombreJugador) {
        this.jugadores.push(nombreJugador);
    }
  };

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
        // Guardamos el nick del usuario, sin espacios en caso que los tenga
        socket.nickname = data;
        var cantidadConectados=nickNamesUsados.length;
        //si la cantidad de usuarios es 0
        if(cantidadConectados==0){
          asignarTablero(salasTablero, salas[0].nombre);//Asigno tablero en la sala por defecto
          //se debe a que si todos se deslogean, la sala por defecto se resetea
        }

        //se crea un buzon para el nickName creado
        nickSocket[socket.nickname]=socket;
        // Agregamos al usuario al arreglo de conectados
        nickNamesUsados.push(socket.nickname);

        

         //este corresponde al tamanio de la lista de conectados antes de pertenecer a la lista
        //-----------------------------------------------------------
        //si hay 4 en la sala por defecto, se debe crear otra sala por defecto
        if (salas[salasPosicion[salasPorDefecto[salasPorDefecto.length-1]]].jugadores.length==4) {
          //se crea una nueva sala por defecto que se apila a la lista de salas por defecto
          //ademas se ingresa esta sala al diccionario de salas versus posicion de la lista de salas
          salasPorDefecto.push('salaPorDefecto_'+salasPorDefecto.length)
          agregarSala(salasPorDefecto[salasPorDefecto.length-1],salas, salasPosicion); //siempre uso el de la ultima posicion
          //una vez hecha la sala, se le asigna un nuevo tablero
          asignarTablero(salasTablero, salasPorDefecto[salasPorDefecto.length-1]);
        }

        socket.join(salas[salasPosicion[salasPorDefecto[salasPorDefecto.length-1]]].nombre); //se ingresa a la sala por defecto
        socket.salaActual=salas[salasPosicion[salasPorDefecto[salasPorDefecto.length-1]]].nombre; //se crea un atributo salaActual al socket y se asocia su sala actual a este atributo

        

        //socket.join(salas[0].nombre); //se ingresa a la sala por defecto
        //console.log('info:::'+salas[salasPosicion[salasPorDefecto[salasPorDefecto.length-1]]].jugadores);
        //socket.salaActual=salas[0].nombre; //se crea un atributo salaActual al socket y se asocia su sala actual a este atributo
        //este corresponde al tamanio de la lista de conectados antes de pertenecer a la lista
        //-----------------------------------------------------------
        //si no hay nadie en la sala, el turno actual sera de la persona que acaba de ingresar
        if (salas[salasPosicion[socket.salaActual]].jugadores.length==0) {
          salas[salasPosicion[socket.salaActual]].turnoActual=socket.nickname;
          console.log('turno sala '+socket.salaActual+': '+salas[salasPosicion[socket.salaActual]].turnoActual); //->Test
          //----------------------------------------------------------------------------------------------------
          //Emitir un mensaje a la persona que le toca jugar, las confirmaciones Siempre seran true
          var confirmacion=true;
          nickSocket[salas[salasPosicion[socket.salaActual]].turnoActual].emit('turnoParaJugar', confirmacion);
          //-----------------------------------------------------------------------------------------------------

        }
        //Se debe agregar el usuario a la informacion de la sala actual
        //A la lista de jugadores de la  sala actual, se le pushea el nombre del jugador actual
        salas[salasPosicion[socket.salaActual]].jugadores.push(socket.nickname);
        //se muestra por consola la lista de jugadores que tiene la sala actual por consola ->Test
        console.log('Jugadores sala '+socket.salaActual+': '+salas[salasPosicion[socket.salaActual]].jugadores); //->Test
        //---------------------------Falta gestionar el turno para el primer ingreso---------------------

        if(cantidadConectados>0){
          mensajeAEnviar=socket.nickname+' ha ingresado a la sala';
          io.to(socket.salaActual).emit('receivingGeneralMessage', mensajeAEnviar); 
        }

        //console.log('jugador: '+socket.nickname+' esta en el siguiente tablero'); Test muestra tablero
        //console.log(salasTablero[socket.salaActual]); //Test! muestro el tablero de la sala actual
        usuariosConectados(); //se actualizan los usuarios conectados
        salasActivas(); //se actualizan las salas activas
        infoUsuario(socket); //se actualiza la informacion del usuario
        tableroSalaActual(socket); //se actualiza el tablero una vez ya esta logeado
      }
    });
  }
//Funcion que recibe un mensaje de la vista, y lo envia a todos los usuarios que estan en la misma sala
function chatGeneral(socket){
  socket.on('sendingGeneralMessage', function(msg){
    msg='['+socket.nickname+']:'+msg;
  io.to(socket.salaActual).emit('receivingGeneralMessage', msg);
  console.log(msg+' (MensajeNormal)');
  });
}

//Funcion que recibe un mensaje de un usuario, y  lo redirige a un determinado socket de determinado usuario
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

//Funcion que envia una lista de los usuarios conectados especificando en que sala estan
function requestForInfoUsuarios(socket){
    socket.on('requestForInfoUsuarios', function(msg){
    var infoUsuarios = [];
    for (clave in nickSocket) {
      infoUsuarios.push(nickSocket[clave].nickname+' en '+nickSocket[clave].salaActual);
    }
    socket.emit('usuariosConectados', infoUsuarios);
  })
}

//Funcion que envia una lista de los usuarios sin especificar la sala
function usuariosConectados(){
    io.sockets.emit('usuariosConectados', nickNamesUsados);
  }

//Funcion que envia la informacion actual de usuario a la vista
function infoUsuario(socket){
  var infoPersonal=[];
  infoPersonal.push(socket.nickname);
  infoPersonal.push(socket.salaActual);
  infoPersonal.push(salas[salasPosicion[socket.salaActual]].puntaje); //es el puntaje de la sala
    nickSocket[socket.nickname].emit('infoUsuario', infoPersonal);
  }

//Funcion que actualiza la informacion de usuario de todos los usuarios conectados en la sala del usuario actual
function actualizaJugadoresSala(socket){
  var infoPersonal=[];
  infoPersonal.push(socket.nickname);
  infoPersonal.push(socket.salaActual);
  infoPersonal.push(salas[salasPosicion[socket.salaActual]].puntaje); //es el puntaje de la sala
  io.to(socket.salaActual).emit('infoUsuario', infoPersonal);
  }

//funcion que maneja el cambio de sala de un usuario, tras recibir una peticion, si no existe se crea, caso contrario, se une
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

      //Y hay que regestionar el turno de la sala antigua---------------------------------------
        var posicionTurno=salas[salasPosicion[socket.salaActual]].jugadores.indexOf(salas[salasPosicion[socket.salaActual]].turnoActual);
        if(posicionTurno!=salas[salasPosicion[socket.salaActual]].jugadores.length-1){
          salas[salasPosicion[socket.salaActual]].turnoActual=salas[salasPosicion[socket.salaActual]].jugadores[posicionTurno+1];
        }
        else{
          salas[salasPosicion[socket.salaActual]].turnoActual=salas[salasPosicion[socket.salaActual]].jugadores[0];
        }

        //Si la sala antigua no queda vacia, envio el turno de esa sala a la persona que le toca jugar
        var confirmacion2=true;
        if(salas[salasPosicion[socket.salaActual]].jugadores.length!=0){
        nickSocket[salas[salasPosicion[socket.salaActual]].turnoActual].emit('turnoParaJugar', confirmacion2);
        }


      //-----------------------------------------------------------------------------------------

      //Aqui hay que quitar al usuario de la lista de jugadores activos que tiene la sala actual
      //para ello se obtiene la posicion que tiene el nombre del jugador en la lista de jugadores de la sala
      var posicionAEliminar=salas[salasPosicion[socket.salaActual]].jugadores.indexOf(socket.nickname);
      //funcion que elimina elementos de un array, primer argumento es la posicion a eliminar, segundo argumento es la cantidad
      //de elementos a eliminar a partir la posicion mencionada
      salas[salasPosicion[socket.salaActual]].jugadores.splice(posicionAEliminar,1);
      tableroSalaActual(socket); //antes de salir de la sala debo actualizar la visualizacion de las celdas de la sala antigua
      console.log('Jugadores sala antigua '+socket.salaActual+': '+salas[salasPosicion[socket.salaActual]].jugadores); //->Test


      io.to(socket.salaActual).emit('receivingGeneralMessage', mensajeAEnviar);
      //salgo de la sala actual
      socket.leave(socket.salaActual);
      //asocio la nueva sala
      socket.salaActual=data;
      asignarTablero(salasTablero, socket.salaActual); //asigno un tablero nuevo a la sala recien creada
      console.log(socket.nickname+' ha ingresado a la sala '+socket.salaActual);
      //ingreso a la nueva sala
      socket.join(data);

      //si no hay nadie en la sala, el turno actual sera de la persona que acaba de ingresar

      if (salas[salasPosicion[socket.salaActual]].jugadores.length==0) {
          salas[salasPosicion[socket.salaActual]].turnoActual=socket.nickname;
          console.log('turno sala '+socket.salaActual+': '+salas[salasPosicion[socket.salaActual]].turnoActual); //->Test
          //----------------------------------------------------------------------------------------------------
          //Emitir un mensaje a la persona que le toca jugar, las confirmaciones Siempre seran true
          var confirmacion=true;
          nickSocket[salas[salasPosicion[socket.salaActual]].turnoActual].emit('turnoParaJugar', confirmacion);
          //---------
        }

      //Se debe agregar el usuario a la informacion de la sala actual
      //A la lista de jugadores de la  sala actual, se le pushea el nombre del jugador actual

      salas[salasPosicion[socket.salaActual]].jugadores.push(socket.nickname);
      console.log('Jugadores sala nueva '+socket.salaActual+': '+salas[salasPosicion[socket.salaActual]].jugadores); //->Test


      //mensaje a todos los conectados
      mensajeAEnviar=socket.nickname+' ha creado la sala '+data;
      io.sockets.emit('receivingGeneralMessage', mensajeAEnviar);
      mensajeAEnviar=socket.nickname+' ha ingresado a la sala';
      io.to(socket.salaActual).emit('receivingGeneralMessage', mensajeAEnviar);
      //se actualizan las salas activas
      salasActivas();
    }
    else{

      //si la sala ya tiene 4 jugadores
      if(salas[salasPosicion[String(data)]].jugadores.length==4){
        //no se puede cambiar de sala
        mensajeAEnviar='[System]: No puedes cambiarte a la sala '+data+' ya tiene el max. de jugadores';
        io.to(socket.salaActual).emit('receivingGeneralMessage', mensajeAEnviar);
      }

      //caso contrario, funciona todo con normalidad

      else{

      //Se anuncia en la sala actual que ha salido de la sala
      mensajeAEnviar=socket.nickname+' ha salido de la sala';
      console.log(socket.nickname+' ha salido de la sala '+socket.salaActual);

      //Aqui hay que quitar al usuario de la lista de jugadores activos que tiene la sala actual
      //para ello se obtiene la posicion que tiene el nombre del jugador en la lista de jugadores de la sala
      var posicionAEliminar=salas[salasPosicion[socket.salaActual]].jugadores.indexOf(socket.nickname);
      //funcion que elimina elementos de un array, primer argumento es la posicion a eliminar, segundo argumento es la cantidad
      //de elementos a eliminar a partir la posicion mencionada
      salas[salasPosicion[socket.salaActual]].jugadores.splice(posicionAEliminar,1);
      tableroSalaActual(socket); //antes de salir de la sala debo actualizar la visualizacion de las celdas de la sala antigua
      console.log('Jugadores sala antigua '+socket.salaActual+': '+salas[salasPosicion[socket.salaActual]].jugadores); //->Test

       //salgo de la sala actual
      socket.leave(socket.salaActual);
      //asocio la nueva sala
      socket.salaActual=data;
      //ingreso a la nueva sala
      socket.join(data);
      console.log(socket.nickname+' ha ingresado a la sala '+socket.salaActual);
      salas[salasPosicion[socket.salaActual]].jugadores.push(socket.nickname);
      console.log('Jugadores sala nueva '+socket.salaActual+': '+salas[salasPosicion[socket.salaActual]].jugadores); //->Test

      //envio un mensaje a todos los conectados en la sala actual
      mensajeAEnviar=socket.nickname+' ha ingresado a la sala';
      io.to(socket.salaActual).emit('receivingGeneralMessage', mensajeAEnviar);
    }
    }//fin else sobre la cantidad de jugadores sala 
    //console.log('jugador: '+socket.nickname+' esta en el siguiente tablero'); Test muestra tablero
    //console.log(salasTablero[socket.salaActual]); //Test! muestro el tablero de la sala actual
    usuariosConectados(); //se actualiza la lista de conectados, para resetear en caso de que @ver este activo
    infoUsuario(socket); //se actualiza la informacion del usuario
    tableroSalaActual(socket); //se actualiza el tablero actual

    });
  }

//Funcion que envia a todos los usuarios conectados, una lista con las salas activas
function salasActivas(){
    var nombreSalas=[];
    for (var i=0;i<salas.length;i++){
      nombreSalas.push(salas[i].nombre);
    }
    io.sockets.emit('salasActivas', nombreSalas);
  }

//Emito la matriz que esta asociada a la sala que esta asociada al socket actual
function tableroSalaPersonal(socket){
     socket.emit('tableroSalaActual', mostrarTablero(salas[salasPosicion[socket.salaActual]],socket,salasTablero));
    //socket.emit('tableroSalaActual', salasTablero[socket.salaActual]);
  }

//Emito la matriz que esta asociada a la sala actual a todos los jugadores que estan en la sala
function tableroSalaActual(socket){
    //io.to(socket.salaActual).emit('tableroSalaActual', salasTablero[socket.salaActual]);
    var mensajeSalaActualizada='[System]:sala actualizada';
var cantidadJugadores=salas[salasPosicion[socket.salaActual]].jugadores.length;
  for (var cadaJugador=0;cadaJugador<cantidadJugadores;cadaJugador++){
    tableroSalaPersonal(nickSocket[salas[salasPosicion[socket.salaActual]].jugadores[cadaJugador]]);
    nickSocket[salas[salasPosicion[socket.salaActual]].jugadores[cadaJugador]].emit('receivingGeneralMessage', mensajeSalaActualizada);
    //console.log(salasTablero[salas[salasPosicion[socket.salaActual]].nombre]); Test muestra tablero
    }

  }

/*-------------------------------------------------------------------------
/*------------------Funciones respecto al juego--------------------------*/

//Funcion que copia una matriz de valores, y retorna la misma matriz pero con una referencia de memoria diferente
function copiaPorValor(matrizACopiar){
  var nuevaMatriz=[];
  for(var i=0;i<matrizACopiar.length;i++){
    nuevaMatriz[i]=[].concat(matrizACopiar[i]);
  }
  return nuevaMatriz;
}

//Funcion que gestiona la visibilidad del tablero actual de la sala, dependiendo de la cantidad de usuarios de la misma
function mostrarTablero(sala,socket,diccionarioSalaTablero){
  //si la cantidad de jugadores en la sala actual es de 1
  var posJugador=sala.jugadores.indexOf(socket.nickname);
  console.log('posJugador '+socket.nickname+' es '+posJugador);
  var tableroAMostrar;
  if (sala.jugadores.length==1){
    //console.log(sala.nombre);
    //console.log(diccionarioSalaTablero[sala.nombre]);
    return diccionarioSalaTablero[sala.nombre]; 
  }

  //veo en que posicion esta el jugador actual en la lista de jugadores

  else if(sala.jugadores.length==2){
    //veo en que posicion esta el jugador actual en la lista de jugadores
    if(posJugador==0){
      tableroAMostrar=copiaPorValor(diccionarioSalaTablero[sala.nombre]);//.slice(0); //se pasa una copia POR VALOR a tableroAMostrar, en caso de no poner .slice() se pasaria una copia por referencia
      for (var x=0;x<10;x++){ //desde la fila 0
        for(var y=5;y<10;y++){ //pero desde la columna 5
          if(tableroAMostrar[x][y] != '@' && tableroAMostrar[x][y] != 'S'){ //Si es arroba, no se reemplaza!!
            tableroAMostrar[x][y]='X'; //oculto la informacion
          }
        }
      } 
      //console.log(sala.nombre+' : '+socket.nickname);
      //console.log(tableroAMostrar);
      return tableroAMostrar;
    }

    else{ //entonces la posicion del jugador es 1
      tableroAMostrar=copiaPorValor(diccionarioSalaTablero[sala.nombre]);//.slice(0); //se pasa una copia POR VALOR a tableroAMostrar, en caso de no poner .slice() se pasaria una copia por referencia
      for (var x=0;x<10;x++){ //desde la fila 0
          for(var y=0;y<5;y++){ //pero desde la columna 0 hasta la 4 
            if(tableroAMostrar[x][y] != '@' && tableroAMostrar[x][y] != 'S'){ //Si es arroba, no se reemplaza!!
              tableroAMostrar[x][y]='X'; //oculto la informacion
          }
        }
      } 
      //console.log(sala.nombre+' : '+socket.nickname);
      //console.log(tableroAMostrar);
      return tableroAMostrar;
    }

  }//Fin condicion jugadores =2

    else if(sala.jugadores.length==3){ //Si hay 3 jugadores en la sala actual
    //veo en que posicion esta el jugador actual en la lista de jugadores
    if(posJugador==0){
      tableroAMostrar=copiaPorValor(diccionarioSalaTablero[sala.nombre]);//.slice(0); //se pasa una copia POR VALOR a tableroAMostrar, en caso de no poner .slice() se pasaria una copia por referencia
      for (var x=0;x<10;x++){ //desde la fila 0
        for(var y=3;y<10;y++){ //pero desde la columna 5
          if(tableroAMostrar[x][y] != '@' && tableroAMostrar[x][y] != 'S'){ //Si es arroba, no se reemplaza!!
            tableroAMostrar[x][y]='X'; //oculto la informacion
          }
        }
      } 
      //console.log(sala.nombre+' : '+socket.nickname);
      //console.log(tableroAMostrar);
      return tableroAMostrar;
    }

    else if(posJugador==1){ //entonces la posicion del jugador es 1
      tableroAMostrar=copiaPorValor(diccionarioSalaTablero[sala.nombre]);//.slice(0); //se pasa una copia POR VALOR a tableroAMostrar, en caso de no poner .slice() se pasaria una copia por referencia
      for (var x=0;x<10;x++){ //desde la fila 0
          for(var y=0, k=7;y<3 && k<10;y++,k++){ //pero desde la columna 0 hasta la 4 
            if(tableroAMostrar[x][y] != '@' && tableroAMostrar[x][y] != 'S'){ //Si es arroba, no se reemplaza!!
              tableroAMostrar[x][y]='X'; //oculto la informacion
          }

          if(tableroAMostrar[x][k] != '@' && tableroAMostrar[x][y] != 'S'){ //Si es arroba, no se reemplaza!!
              tableroAMostrar[x][k]='X'; //oculto la informacion
          }
        }
      } 
      //console.log(sala.nombre+' : '+socket.nickname);
      //console.log(tableroAMostrar);
      return tableroAMostrar;
    }

    else { //entonces la posicion del jugador es 2
      tableroAMostrar=copiaPorValor(diccionarioSalaTablero[sala.nombre]);//.slice(0); //se pasa una copia POR VALOR a tableroAMostrar, en caso de no poner .slice() se pasaria una copia por referencia
      for (var x=0;x<10;x++){ //desde la fila 0
          for(var y=0;y<7;y++){ //pero desde la columna 0 hasta la 4 
            if(tableroAMostrar[x][y] != '@' && tableroAMostrar[x][y] != 'S'){ //Si es arroba, no se reemplaza!!
              tableroAMostrar[x][y]='X'; //oculto la informacion
          }
        }
      } 
      //console.log(sala.nombre+' : '+socket.nickname);
      //console.log(tableroAMostrar);
      return tableroAMostrar;
    }

  }//Fin condicion jugadores =3

  else{ //Entonces hay 4 jugadores
        //return diccionarioSalaTablero[sala.nombre]; 

    //veo en que posicion esta el jugador actual en la lista de jugadores
    if(posJugador==0){
      tableroAMostrar=copiaPorValor(diccionarioSalaTablero[sala.nombre]);//.slice(0); //se pasa una copia POR VALOR a tableroAMostrar, en caso de no poner .slice() se pasaria una copia por referencia
      for (var x=5, j=0, z=5; x<10 && j<5 && z<10;x++,j++,z++){ //desde la fila 0 //Asi obtengo el primer 4to
        for(var y=0, k=5, n=5; y<5 && k<10 && n<10;y++,k++,n++){ //pero desde la columna 5

          if(tableroAMostrar[x][y] != '@' && tableroAMostrar[x][y] != 'S'){ //Si es arroba, no se reemplaza!!
            tableroAMostrar[x][y]='X'; //oculto la informacion
          }

          if(tableroAMostrar[j][k] != '@' && tableroAMostrar[j][k] != 'S'){ //Si es arroba, no se reemplaza!!
            tableroAMostrar[j][k]='X'; //oculto la informacion
          }

          if(tableroAMostrar[z][n] != '@' && tableroAMostrar[z][n] != 'S'){ //Si es arroba, no se reemplaza!!
            tableroAMostrar[z][n]='X'; //oculto la informacion
          }
        }
      } 
      //console.log(sala.nombre+' : '+socket.nickname);
      //console.log(tableroAMostrar);
      return tableroAMostrar;
    }

    else if(posJugador==1){ //entonces la posicion del jugador es 1
      tableroAMostrar=copiaPorValor(diccionarioSalaTablero[sala.nombre]);//.slice(0); //se pasa una copia POR VALOR a tableroAMostrar, en caso de no poner .slice() se pasaria una copia por referencia
      for (var x=0, j=5, z=5; x<5 && j<10 && z<10;x++,j++,z++){ //desde la fila 0 //Asi obtengo el primer 4to
        for(var y=0, k=0, n=5; y<5 && k<5 && n<10;y++,k++,n++){ //pero desde la columna 5

          if(tableroAMostrar[x][y] != '@' && tableroAMostrar[x][y] != 'S'){ //Si es arroba, no se reemplaza!!
            tableroAMostrar[x][y]='X'; //oculto la informacion
          }

          if(tableroAMostrar[j][k] != '@' && tableroAMostrar[j][k] != 'S'){ //Si es arroba, no se reemplaza!!
            tableroAMostrar[j][k]='X'; //oculto la informacion
          }

          if(tableroAMostrar[z][n] != '@' && tableroAMostrar[z][n] != 'S'){ //Si es arroba, no se reemplaza!!
            tableroAMostrar[z][n]='X'; //oculto la informacion
          }
        }
      } 
      //console.log(sala.nombre+' : '+socket.nickname);
      //console.log(tableroAMostrar);
      return tableroAMostrar;
    }

    else if(posJugador==2) { //entonces la posicion del jugador es 2
      tableroAMostrar=copiaPorValor(diccionarioSalaTablero[sala.nombre]);//.slice(0); //se pasa una copia POR VALOR a tableroAMostrar, en caso de no poner .slice() se pasaria una copia por referencia
      for (var x=0, j=0, z=5; x<5 && j<5 && z<10;x++,j++,z++){ //desde la fila 0 //Asi obtengo el primer 4to
        for(var y=0, k=5, n=5; y<5 && k<10 && n<10;y++,k++,n++){ //pero desde la columna 5

          if(tableroAMostrar[x][y] != '@' && tableroAMostrar[x][y] != 'S'){ //Si es arroba, no se reemplaza!!
            tableroAMostrar[x][y]='X'; //oculto la informacion
          }

          if(tableroAMostrar[j][k] != '@' && tableroAMostrar[j][k] != 'S'){ //Si es arroba, no se reemplaza!!
            tableroAMostrar[j][k]='X'; //oculto la informacion
          }

          if(tableroAMostrar[z][n] != '@' && tableroAMostrar[z][n] != 'S'){ //Si es arroba, no se reemplaza!!
            tableroAMostrar[z][n]='X'; //oculto la informacion
          }
        }
      } 
      //console.log(sala.nombre+' : '+socket.nickname);
      //console.log(tableroAMostrar);
      return tableroAMostrar;
    }

    else { //entonces la posicion del ultimo jugador
      tableroAMostrar=copiaPorValor(diccionarioSalaTablero[sala.nombre]);//.slice(0); //se pasa una copia POR VALOR a tableroAMostrar, en caso de no poner .slice() se pasaria una copia por referencia
      for (var x=0, j=0, z=5; x<5 && j<5 && z<10;x++,j++,z++){ //desde la fila 0 //Asi obtengo el primer 4to
        for(var y=0, k=5, n=0; y<5 && k<10 && n<5;y++,k++,n++){ //pero desde la columna 5

          if(tableroAMostrar[x][y] != '@' && tableroAMostrar[x][y] != 'S'){ //Si es arroba, no se reemplaza!!
            tableroAMostrar[x][y]='X'; //oculto la informacion
          }

          if(tableroAMostrar[j][k] != '@' && tableroAMostrar[j][k] != 'S'){ //Si es arroba, no se reemplaza!!
            tableroAMostrar[j][k]='X'; //oculto la informacion
          }

          if(tableroAMostrar[z][n] != '@' && tableroAMostrar[z][n] != 'S'){ //Si es arroba, no se reemplaza!!
            tableroAMostrar[z][n]='X'; //oculto la informacion
          }
        }
      }  
      //console.log(sala.nombre+' : '+socket.nickname);
      //console.log(tableroAMostrar);
      return tableroAMostrar;
    }

    }//Fin condicion jugadores =4
}//fin funcion mostrarTablero

//Funcion que asigna un tablero a un nombre de sala pasado por argumento, a un diccionario tambien pasado por argumento
function asignarTablero(diccionarioSalas, nombreSala){
  diccionarioSalas[nombreSala]=inicializaTablero(); //inicializo un tablero en la sala de entrada
}

//Funcion que crea un tablero, con 1 Raton, 1 salida, 15 trampas fijas, existe la posibibilidad que la salida sobreescriba una trampa
function inicializaTablero(){
  var tablero = [];
  for(var i=0; i<10; i++) {
    tablero[i] = [];
    for(var j=0; j<10; j++) {
        tablero[i][j] = 'O'; //no hay nada (o mayuscula)
    }
  }

  //Se agregan 15 trampas al inicio
  for (var i=0;i<15;i++){
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

//Funcion que genera un numero random, entero en un determinado rango (incluye los numeros del rango)
//http://stackoverflow.com/questions/1527803/generating-random-numbers-in-javascript-in-a-specific-range
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

//Funcion que gestiona la peticion del usuario para aumentar 1 posicion hacia arriba del raton del tablero
function requestForUp(socket){
    socket.on('requestForUp', function(callback){  
      var confirmaFinal=false; //bandera que avisa si se termino o no el juego
      var mensajeFinal; //variable donde se guardara el mensaje final en caso que sea el final
      //Si la fila del raton de la sala actual que se contiene en la lista de salas es 0
      //console.log('la posicion de la sala:'+socket.salaActual+' es '+salasPosicion[socket.salaActual]); Test
      //console.log(salas[salasPosicion[socket.salaActual]].posicionRaton[0]); Test
      if (salas[salasPosicion[socket.salaActual]].posicionRaton[0]==0){
        //console.log('movimiento invalido!!');
        callback(false);
      }
      // Si no
      else{
        //socket.puntaje
        //salasTablero={} //diccionario que tiene nombreSala:Tablero
        callback(true);
        var posAntigua=[salas[salasPosicion[socket.salaActual]].posicionRaton[0],salas[salasPosicion[socket.salaActual]].posicionRaton[1]];
        var posNueva=[posAntigua[0]-1,posAntigua[1]]; //sube una fila

        var celdaRaton=salasTablero[socket.salaActual][posNueva[0]][posNueva[1]];
        //la posicion antes de mover el raton se reemplaza por su estado inicial
        salasTablero[socket.salaActual][posAntigua[0]][posAntigua[1]]=salas[salasPosicion[socket.salaActual]].posicionRatonAnterior;

        switch(celdaRaton) {
                    
                    case 'T':
                    salas[salasPosicion[socket.salaActual]].puntaje=salas[salasPosicion[socket.salaActual]].puntaje-500;
                    //se guarda la posicion siguiente en la posicion antigua del tablero antes de ser reemplaza por el raton
                    //Este caso, como es trampa, la posicion anterior sera 'O' pues no hay nada en la posicion inicial del raton
                    salas[salasPosicion[socket.salaActual]].posicionRatonAnterior='O';
                    //se reemplaza la posicion inicial por el raton, pues volvio al inicio
                    salasTablero[socket.salaActual][0][0]='@';
                    //se actualiza la posicion del raton
                    salas[salasPosicion[socket.salaActual]].posicionRaton=[0,0];
                    break;

                    case 'O':
                    salas[salasPosicion[socket.salaActual]].puntaje=salas[salasPosicion[socket.salaActual]].puntaje-100;
                
                    //se guarda la posicion siguiente en la posicion antigua del tablero antes de ser reemplaza por el raton
                    salas[salasPosicion[socket.salaActual]].posicionRatonAnterior=salasTablero[socket.salaActual][posNueva[0]][posNueva[1]];
                    //se reemplaza la posicion nueva por el raton
                    salasTablero[socket.salaActual][posNueva[0]][posNueva[1]]='@';
                    //se actualiza la posicion del raton
                    salas[salasPosicion[socket.salaActual]].posicionRaton=posNueva;
                    break;

                    case 'S': //Se termina el juego
                    var nombreSalaActual=socket.salaActual;
                    var puntajeFinal=salas[salasPosicion[socket.salaActual]].puntaje;
                    //se forma el mensaje y se envia a todos los usuarios de la sala
                    mensajeFinal='El juego ha finalizado, en la sala '+nombreSalaActual+' han terminado con '+puntajeFinal+' puntos';
                    io.to(socket.salaActual).emit('receivingFinalMessage',mensajeFinal);

                    //reseteo el tablero actual
                    asignarTablero(salasTablero, nombreSalaActual);
                    salas[salasPosicion[nombreSalaActual]].puntaje=10000; //se resetea puntaje
                    salas[salasPosicion[socket.salaActual]].posicionRatonAnterior='O';
                    //se reemplaza la posicion inicial por el raton, pues volvio al inicio
                    salasTablero[socket.salaActual][0][0]='@';
                    //se actualiza la posicion del raton
                    salas[salasPosicion[socket.salaActual]].posicionRaton=[0,0];
                    break;

                    default:
                    console.log('paso algo raro con el movimiento de '+socket.nickname);
                    break;
                  }

        //Si no es el final, opera con naturalidad
        /*para cada peticion de movimiento de raton
        cada vez que haga un movimiento
        buscar la posicion del turno actual en la lista de jugadores
        si la posicion es distinta al largo de aquella lista-1  (ultima posicion)
        --->turno actual= listaJugadores[posicionencontrada+1]

        caso contrario:
        --->turno actual = lista[Jugadores][0]*/


        var posicionTurno=salas[salasPosicion[socket.salaActual]].jugadores.indexOf(salas[salasPosicion[socket.salaActual]].turnoActual);
        if(posicionTurno!=salas[salasPosicion[socket.salaActual]].jugadores.length-1){
          salas[salasPosicion[socket.salaActual]].turnoActual=salas[salasPosicion[socket.salaActual]].jugadores[posicionTurno+1];
        }
        else{
          salas[salasPosicion[socket.salaActual]].turnoActual=salas[salasPosicion[socket.salaActual]].jugadores[0];
        }

        //----------------------------------------------------------------------------------------------------
        //Emitir un mensaje a la persona que le toca jugar, las confirmaciones Siempre seran true
        var confirmacion=true;
        nickSocket[salas[salasPosicion[socket.salaActual]].turnoActual].emit('turnoParaJugar', confirmacion);
        //-----------------------------------------------------------------------------------------------------

        //Emitir un mensaje a la sala actual que mencione a la persona que le toca jugar
        var mensajeSala='[System]: Turno de '+ salas[salasPosicion[socket.salaActual]].turnoActual;
        io.to(socket.salaActual).emit('receivingGeneralMessage', mensajeSala); //emitir un mensaje que diga el turno actual del jugador


        console.log('turno Actual sala '+socket.salaActual+': '+salas[salasPosicion[socket.salaActual]].turnoActual); //->Test

        //infoUsuario(socket);
        actualizaJugadoresSala(socket);
        tableroSalaActual(socket);
        //tableroActualizaSalaActual(socket);

        }
      
    });
  }

//Funcion que gestiona la peticion del usuario para disminuir 1 posicion hacia abajo del raton del tablero
function requestForDown(socket){
    socket.on('requestForDown', function(callback){  
      var confirmaFinal=false; //bandera que avisa si se termino o no el juego
      var mensajeFinal; //variable donde se guardara el mensaje final en caso que sea el final
      if (salas[salasPosicion[socket.salaActual]].posicionRaton[0]==9){
        //console.log('movimiento invalido!!');
        callback(false);
      }
      // Si no
      else{
        //socket.puntaje
        callback(true);
        //celda que acaba de pisar el raton

        //console.log('posicion antigua raton: '+salas[salasPosicion[socket.salaActual]].posicionRaton); <-Test!
        var posAntigua=[salas[salasPosicion[socket.salaActual]].posicionRaton[0],salas[salasPosicion[socket.salaActual]].posicionRaton[1]];
        var posNueva=[posAntigua[0]+1,posAntigua[1]]; //sube una fila

        var celdaRaton=salasTablero[socket.salaActual][posNueva[0]][posNueva[1]];
        //la posicion antes de mover el raton se reemplaza por su estado inicial
        salasTablero[socket.salaActual][posAntigua[0]][posAntigua[1]]=salas[salasPosicion[socket.salaActual]].posicionRatonAnterior;

        switch(celdaRaton) {
                    
                    case 'T':
                    salas[salasPosicion[socket.salaActual]].puntaje=salas[salasPosicion[socket.salaActual]].puntaje-500;
                    //se guarda la posicion siguiente en la posicion antigua del tablero antes de ser reemplaza por el raton
                    //Este caso, como es trampa, la posicion anterior sera 'O' pues no hay nada en la posicion inicial del raton
                    salas[salasPosicion[socket.salaActual]].posicionRatonAnterior='O';
                    //se reemplaza la posicion inicial por el raton, pues volvio al inicio
                    salasTablero[socket.salaActual][0][0]='@';
                    //se actualiza la posicion del raton
                    salas[salasPosicion[socket.salaActual]].posicionRaton=[0,0];
                    break;

                    case 'O':
                    salas[salasPosicion[socket.salaActual]].puntaje=salas[salasPosicion[socket.salaActual]].puntaje-100;
                    //se guarda la posicion siguiente en la posicion antigua del tablero antes de ser reemplaza por el raton
                    salas[salasPosicion[socket.salaActual]].posicionRatonAnterior=salasTablero[socket.salaActual][posNueva[0]][posNueva[1]];
                    //se reemplaza la posicion nueva por el raton
                    salasTablero[socket.salaActual][posNueva[0]][posNueva[1]]='@';
                    //se actualiza la posicion del raton
                    salas[salasPosicion[socket.salaActual]].posicionRaton=posNueva;
                    break;

                    case 'S':
                    var nombreSalaActual=socket.salaActual;
                    var puntajeFinal=salas[salasPosicion[socket.salaActual]].puntaje;
                    //se forma el mensaje y se envia a todos los usuarios de la sala
                    mensajeFinal='El juego ha finalizado, en la sala '+nombreSalaActual+' han terminado con '+puntajeFinal+' puntos';
                    io.to(socket.salaActual).emit('receivingFinalMessage',mensajeFinal);

                    //reseteo el tablero actual
                    asignarTablero(salasTablero, nombreSalaActual);
                    salas[salasPosicion[nombreSalaActual]].puntaje=10000; //se resetea puntaje
                    salas[salasPosicion[socket.salaActual]].posicionRatonAnterior='O';
                    //se reemplaza la posicion inicial por el raton, pues volvio al inicio
                    salasTablero[socket.salaActual][0][0]='@';
                    //se actualiza la posicion del raton
                    salas[salasPosicion[socket.salaActual]].posicionRaton=[0,0];
                    break;

                    default:
                    console.log('paso algo raro con el movimiento de '+socket.nickname);
                    break;
                  }

        /*para cada peticion de movimiento de raton
        cada vez que haga un movimiento
        buscar la posicion del turno actual en la lista de jugadores
        si la posicion es distinta al largo de aquella lista-1  (ultima posicion)
        --->turno actual= listaJugadores[posicionencontrada+1]

        caso contrario:
        --->turno actual = lista[Jugadores][0]*/

        var posicionTurno=salas[salasPosicion[socket.salaActual]].jugadores.indexOf(salas[salasPosicion[socket.salaActual]].turnoActual);
        if(posicionTurno!=salas[salasPosicion[socket.salaActual]].jugadores.length-1){
          salas[salasPosicion[socket.salaActual]].turnoActual=salas[salasPosicion[socket.salaActual]].jugadores[posicionTurno+1];
        }
        else{
          salas[salasPosicion[socket.salaActual]].turnoActual=salas[salasPosicion[socket.salaActual]].jugadores[0];
        }

        //----------------------------------------------------------------------------------------------------
        //Emitir un mensaje a la persona que le toca jugar, las confirmaciones Siempre seran true
        var confirmacion=true;
        nickSocket[salas[salasPosicion[socket.salaActual]].turnoActual].emit('turnoParaJugar', confirmacion);
        //-----------------------------------------------------------------------------------------------------

        //Emitir un mensaje a la sala actual que mencione a la persona que le toca jugar
        var mensajeSala='[System]: Turno de '+ salas[salasPosicion[socket.salaActual]].turnoActual;
        io.to(socket.salaActual).emit('receivingGeneralMessage', mensajeSala); //emitir un mensaje que diga el turno actual del jugador

        console.log('turno Actual sala '+socket.salaActual+': '+salas[salasPosicion[socket.salaActual]].turnoActual); //->Test

        //console.log('posicion nueva raton: '+salas[salasPosicion[socket.salaActual]].posicionRaton); <- Test!
        //infoUsuario(socket);
        actualizaJugadoresSala(socket);
        tableroSalaActual(socket);
        //tableroActualizaSalaActual(socket);

        }
    });
  }

//Funcion que gestiona la peticion del usuario para aumentar 1 posicion hacia la derecha del raton del tablero
function requestForRight(socket){
    socket.on('requestForRight', function(callback){  
      var confirmaFinal=false; //bandera que avisa si se termino o no el juego
      var mensajeFinal; //variable donde se guardara el mensaje final en caso que sea el final
      if (salas[salasPosicion[socket.salaActual]].posicionRaton[1]==9){
        //console.log('movimiento invalido!!');
        callback(false);
      }
      // Si no
      else{
        callback(true);
        //console.log('posicion antigua raton: '+salas[salasPosicion[socket.salaActual]].posicionRaton); <-Test!
        var posAntigua=[salas[salasPosicion[socket.salaActual]].posicionRaton[0],salas[salasPosicion[socket.salaActual]].posicionRaton[1]];
        var posNueva=[posAntigua[0],posAntigua[1]+1]; //sube una fila

        var celdaRaton=salasTablero[socket.salaActual][posNueva[0]][posNueva[1]];
        //la posicion antes de mover el raton se reemplaza por su estado inicial
        salasTablero[socket.salaActual][posAntigua[0]][posAntigua[1]]=salas[salasPosicion[socket.salaActual]].posicionRatonAnterior;

        switch(celdaRaton) {
                    
                    case 'T':
                    salas[salasPosicion[socket.salaActual]].puntaje=salas[salasPosicion[socket.salaActual]].puntaje-500;
                    //se guarda la posicion siguiente en la posicion antigua del tablero antes de ser reemplaza por el raton
                    //Este caso, como es trampa, la posicion anterior sera 'O' pues no hay nada en la posicion inicial del raton
                    salas[salasPosicion[socket.salaActual]].posicionRatonAnterior='O';
                    //se reemplaza la posicion inicial por el raton, pues volvio al inicio
                    salasTablero[socket.salaActual][0][0]='@';
                    //se actualiza la posicion del raton
                    salas[salasPosicion[socket.salaActual]].posicionRaton=[0,0];
                    break;

                    case 'O':
                    salas[salasPosicion[socket.salaActual]].puntaje=salas[salasPosicion[socket.salaActual]].puntaje-100;
                    //se guarda la posicion siguiente en la posicion antigua del tablero antes de ser reemplaza por el raton
                    salas[salasPosicion[socket.salaActual]].posicionRatonAnterior=salasTablero[socket.salaActual][posNueva[0]][posNueva[1]];
                    //se reemplaza la posicion nueva por el raton
                    salasTablero[socket.salaActual][posNueva[0]][posNueva[1]]='@';
                    //se actualiza la posicion del raton
                    salas[salasPosicion[socket.salaActual]].posicionRaton=posNueva;
                    break;

                    case 'S':
                    var nombreSalaActual=socket.salaActual;
                    var puntajeFinal=salas[salasPosicion[socket.salaActual]].puntaje;
                    //se forma el mensaje y se envia a todos los usuarios de la sala
                    mensajeFinal='El juego ha finalizado, en la sala '+nombreSalaActual+' han terminado con '+puntajeFinal+' puntos';
                    io.to(socket.salaActual).emit('receivingFinalMessage',mensajeFinal);
                    //se desconecta a cada usuario de la sala
                    var cantidadJugadores=salas[salasPosicion[socket.salaActual]].jugadores.length;
                    for (var cadaJugador=0;cadaJugador<cantidadJugadores;cadaJugador++){
                      usuarioDesconectado(nickSocket[salas[salasPosicion[socket.salaActual]].jugadores[cadaJugador]]);
                    }
                    //reseteo el tablero actual
                    asignarTablero(salasTablero, nombreSalaActual);
                    salas[salasPosicion[nombreSalaActual]].puntaje=10000; //se resetea puntaje
                    salas[salasPosicion[socket.salaActual]].posicionRatonAnterior='O';
                    //se reemplaza la posicion inicial por el raton, pues volvio al inicio
                    salasTablero[socket.salaActual][0][0]='@';
                    //se actualiza la posicion del raton
                    salas[salasPosicion[socket.salaActual]].posicionRaton=[0,0];
                    break;

                    default:
                    console.log('paso algo raro con el movimiento de '+socket.nickname);
                    break;
                  }

        /*para cada peticion de movimiento de raton
        cada vez que haga un movimiento
        buscar la posicion del turno actual en la lista de jugadores
        si la posicion es distinta al largo de aquella lista-1  (ultima posicion)
        --->turno actual= listaJugadores[posicionencontrada+1]

        caso contrario:
        --->turno actual = lista[Jugadores][0]*/

        var posicionTurno=salas[salasPosicion[socket.salaActual]].jugadores.indexOf(salas[salasPosicion[socket.salaActual]].turnoActual);
        if(posicionTurno!=salas[salasPosicion[socket.salaActual]].jugadores.length-1){
          salas[salasPosicion[socket.salaActual]].turnoActual=salas[salasPosicion[socket.salaActual]].jugadores[posicionTurno+1];
        }
        else{
          salas[salasPosicion[socket.salaActual]].turnoActual=salas[salasPosicion[socket.salaActual]].jugadores[0];
        }

        //----------------------------------------------------------------------------------------------------
        //Emitir un mensaje a la persona que le toca jugar, las confirmaciones Siempre seran true
        var confirmacion=true;
        nickSocket[salas[salasPosicion[socket.salaActual]].turnoActual].emit('turnoParaJugar', confirmacion);
        //-----------------------------------------------------------------------------------------------------

        //Emitir un mensaje a la sala actual que mencione a la persona que le toca jugar
        var mensajeSala='[System]: Turno de '+ salas[salasPosicion[socket.salaActual]].turnoActual;
        io.to(socket.salaActual).emit('receivingGeneralMessage', mensajeSala); //emitir un mensaje que diga el turno actual del jugador

        console.log('turno Actual sala '+socket.salaActual+': '+salas[salasPosicion[socket.salaActual]].turnoActual); //->Test
        //console.log('posicion nueva raton: '+salas[salasPosicion[socket.salaActual]].posicionRaton); <- Test!
        //infoUsuario(socket);
        actualizaJugadoresSala(socket);
        tableroSalaActual(socket);
        //tableroActualizaSalaActual(socket);

        }
    });
  }

//Funcion que gestiona la peticion del usuario para aumentar 1 posicion hacia la izquierda del raton del tablero

function requestForLeft(socket){
    socket.on('requestForLeft', function(callback){  
      var confirmaFinal=false; //bandera que avisa si se termino o no el juego
      var mensajeFinal; //variable donde se guardara el mensaje final en caso que sea el final
      if (salas[salasPosicion[socket.salaActual]].posicionRaton[1]==0){
        //console.log('movimiento invalido!!');
        callback(false);
      }
      // Si no
      else{

        callback(true);
        //console.log('posicion antigua raton: '+salas[salasPosicion[socket.salaActual]].posicionRaton); <-Test!
        var posAntigua=[salas[salasPosicion[socket.salaActual]].posicionRaton[0],salas[salasPosicion[socket.salaActual]].posicionRaton[1]];
        var posNueva=[posAntigua[0],posAntigua[1]-1]; //sube una fila

        var celdaRaton=salasTablero[socket.salaActual][posNueva[0]][posNueva[1]];
        //la posicion antes de mover el raton se reemplaza por su estado inicial
        salasTablero[socket.salaActual][posAntigua[0]][posAntigua[1]]=salas[salasPosicion[socket.salaActual]].posicionRatonAnterior;

        switch(celdaRaton) {
                    
                    case 'T':
                    salas[salasPosicion[socket.salaActual]].puntaje=salas[salasPosicion[socket.salaActual]].puntaje-500;
                    //se guarda la posicion siguiente en la posicion antigua del tablero antes de ser reemplaza por el raton
                    //Este caso, como es trampa, la posicion anterior sera 'O' pues no hay nada en la posicion inicial del raton
                    salas[salasPosicion[socket.salaActual]].posicionRatonAnterior='O';
                    //se reemplaza la posicion inicial por el raton, pues volvio al inicio
                    salasTablero[socket.salaActual][0][0]='@';
                    //se actualiza la posicion del raton
                    salas[salasPosicion[socket.salaActual]].posicionRaton=[0,0];
                    break;

                    case 'O':
                    salas[salasPosicion[socket.salaActual]].puntaje=salas[salasPosicion[socket.salaActual]].puntaje-100;
                    //se guarda la posicion siguiente en la posicion antigua del tablero antes de ser reemplaza por el raton
                    salas[salasPosicion[socket.salaActual]].posicionRatonAnterior=salasTablero[socket.salaActual][posNueva[0]][posNueva[1]];
                    //se reemplaza la posicion nueva por el raton
                    salasTablero[socket.salaActual][posNueva[0]][posNueva[1]]='@';
                    //se actualiza la posicion del raton
                    salas[salasPosicion[socket.salaActual]].posicionRaton=posNueva;
                    break;

                    case 'S':
                    var nombreSalaActual=socket.salaActual;
                    var puntajeFinal=salas[salasPosicion[socket.salaActual]].puntaje;
                    //se forma el mensaje y se envia a todos los usuarios de la sala
                    mensajeFinal='El juego ha finalizado, en la sala '+nombreSalaActual+' han terminado con '+puntajeFinal+' puntos';

                    io.to(socket.salaActual).emit('receivingFinalMessage',mensajeFinal);
                    //se desconecta a cada usuario de la sala
                    var cantidadJugadores=salas[salasPosicion[socket.salaActual]].jugadores.length;
                    for (var cadaJugador=0;cadaJugador<cantidadJugadores;cadaJugador++){
                      usuarioDesconectado(nickSocket[salas[salasPosicion[socket.salaActual]].jugadores[cadaJugador]]);
                    }
                    //reseteo el tablero actual
                    asignarTablero(salasTablero, nombreSalaActual);
                    salas[salasPosicion[nombreSalaActual]].puntaje=10000; //se resetea puntaje
                    salas[salasPosicion[socket.salaActual]].posicionRatonAnterior='O';
                    //se reemplaza la posicion inicial por el raton, pues volvio al inicio
                    salasTablero[socket.salaActual][0][0]='@';
                    //se actualiza la posicion del raton
                    salas[salasPosicion[socket.salaActual]].posicionRaton=[0,0];
                    break;

                    default:
                    console.log('paso algo raro con el movimiento de '+socket.nickname);
                    break;
                  }

        /*para cada peticion de movimiento de raton
        cada vez que haga un movimiento
        buscar la posicion del turno actual en la lista de jugadores
        si la posicion es distinta al largo de aquella lista-1  (ultima posicion)
        --->turno actual= listaJugadores[posicionencontrada+1]

        caso contrario:
        --->turno actual = lista[Jugadores][0]*/

        var posicionTurno=salas[salasPosicion[socket.salaActual]].jugadores.indexOf(salas[salasPosicion[socket.salaActual]].turnoActual);
        if(posicionTurno!=salas[salasPosicion[socket.salaActual]].jugadores.length-1){
          salas[salasPosicion[socket.salaActual]].turnoActual=salas[salasPosicion[socket.salaActual]].jugadores[posicionTurno+1];
        }
        else{
          salas[salasPosicion[socket.salaActual]].turnoActual=salas[salasPosicion[socket.salaActual]].jugadores[0];
        }

        //----------------------------------------------------------------------------------------------------
        //Emitir un mensaje a la persona que le toca jugar, las confirmaciones Siempre seran true
        var confirmacion=true;
        nickSocket[salas[salasPosicion[socket.salaActual]].turnoActual].emit('turnoParaJugar', confirmacion);
        //-----------------------------------------------------------------------------------------------------

        //Emitir un mensaje a la sala actual que mencione a la persona que le toca jugar
        var mensajeSala='[System]: Turno de '+ salas[salasPosicion[socket.salaActual]].turnoActual;
        io.to(socket.salaActual).emit('receivingGeneralMessage', mensajeSala); //emitir un mensaje que diga el turno actual del jugador
        console.log('turno Actual sala '+socket.salaActual+': '+salas[salasPosicion[socket.salaActual]].turnoActual); //->Test

        //console.log('posicion nueva raton: '+salas[salasPosicion[socket.salaActual]].posicionRaton); <- Test!
        //infoUsuario(socket);
        actualizaJugadoresSala(socket);
        tableroSalaActual(socket);
        //tableroActualizaSalaActual(socket);
      
        }
    });
  }

//Funcion que utiliza la funcion de deslogeo, en caso que llegue una peticion de deslog de la vista
function requestForLogout(socket){
    socket.on('requestForLogout', function(){  
      usuarioDesconectado(socket);        
    });
  }

//Funcion que gestiona el deslog del usuario, ya sea por peticion o por perdida abrupta de la conexion con algun usuario activo
function usuarioDesconectado(socket){
  socket.on('disconnect', function () {
    if(socket.nickname!=undefined){
     //Sucesos que pasan cuando un usuario se desconecta
     //ejemplo obtenido de ayudantia clase 3
     //eliminar usuario de nickNamesUsados = [] y nickSocket={} 
    console.log('EL usuario '+socket.nickname+ ' se ha desconectado...');

    //Y hay que regestionar el turno de la sala---------------------------------------
    var posicionTurno=salas[salasPosicion[socket.salaActual]].jugadores.indexOf(salas[salasPosicion[socket.salaActual]].turnoActual);
    if(posicionTurno!=salas[salasPosicion[socket.salaActual]].jugadores.length-1){
      salas[salasPosicion[socket.salaActual]].turnoActual=salas[salasPosicion[socket.salaActual]].jugadores[posicionTurno+1];
    }
      else{
      salas[salasPosicion[socket.salaActual]].turnoActual=salas[salasPosicion[socket.salaActual]].jugadores[0];
    }

      //Si la sala antigua no queda vacia, envio el turno de esa sala a la persona que le toca jugar
      var confirmacion=true;
      if(salas[salasPosicion[socket.salaActual]].jugadores.length!=0){
        tableroSalaActual(socket);
        nickSocket[salas[salasPosicion[socket.salaActual]].turnoActual].emit('turnoParaJugar', confirmacion);
      }


      //-----------------------------------------------------------------------------------------

      //-----------------------------------------------------------------------------------------
    //Aqui hay que quitar al usuario de la lista de jugadores activos que tiene la sala actual
    //para ello se obtiene la posicion que tiene el nombre del jugador en la lista de jugadores de la sala
    var posicionAEliminar=salas[salasPosicion[socket.salaActual]].jugadores.indexOf(socket.nickname);
    //funcion que elimina elementos de un array, primer argumento es la posicion a eliminar, segundo argumento es la cantidad
    //de elementos a eliminar a partir la posicion mencionada
    salas[salasPosicion[socket.salaActual]].jugadores.splice(posicionAEliminar,1);
    tableroSalaActual(socket); //antes de salir de la sala debo actualizar la visualizacion de las celdas de la sala antigua

    console.log('Jugadores sala antigua '+socket.salaActual+': '+salas[salasPosicion[socket.salaActual]].jugadores); //->Test
    var posicionAEliminar=nickNamesUsados.indexOf(socket.nickname);
    //funcion que elimina elementos de un array, primer argumento es la posicion a eliminar, segundo argumento es la cantidad
    //de elementos a eliminar a partir la posicion mencionada
    nickNamesUsados.splice(posicionAEliminar,1);
    delete nickSocket[socket.nickname];

      if(nickNamesUsados.length==0){
          /*while(salas.length > 0) { //forma tradicional de vaciar listas y diccionarios
            salas.pop();
          }
          for (var clave in salasTablero) delete salasTablero[clave];
          for (var clave in salasPosicion) delete salasPosicion[clave];*/

          salas = []; //se resetea la lista de salas
          salasPorDefecto=[];
          salasTablero={};
          salasPosicion={};
          salasPorDefecto.push('salaPorDefecto_'+salasPorDefecto.length)
          agregarSala(salasPorDefecto[salasPorDefecto.length-1],salas, salasPosicion); //siempre uso el de la ultima posicion
          //se debe a que si todos se deslogean, el juego en si se resetea
        }

      else{
          var ultimoMensaje='[System]: El usuario '+socket.nickname+' se ha desconectado.';
          //se manda un mensaje global avisando que el usuario se ha desconectado
          io.sockets.emit('receivingGeneralMessage', ultimoMensaje);
          usuariosConectados();

      }
    }

    else{
      console.log('Se ha salido de la web sin ingresar');
    }

  });
}
/*-------------------------------------------------------------------------*/