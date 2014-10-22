function main(){

        $('#juegoListo').hide();//se oculta el juego hasta que se haya logeado
        //$('#chat').scrollTop = $('#chat').scrollHeight;

        var socket=io();

        //mensajeChat enviado tras hacer click en el boton enviar
        var mensajeChat;

        var usuarioDestino;
        var comando;
        var palabras;
        var mensajeTotal=[];
        var salasOnline;
        var usuariosOnline;

        
        /*------------Boton Ingreso Usuario ----------------*/
         $('#ingresandoNickName').submit(function(e){     

        //Para evitar que se hagan refresh de la página, así solo enviamos el mensaje
        e.preventDefault();

        if($('#nickname').val()==""){
          //Validar un ingreso vacio.
          window.alert("Debe ingresar nombre de usuario.");
        }

        else{
          //emitimos un mensaje al servidor de que hay un nuevo usuario
          //ademas se le quitan los espacios
          socket.emit('requestForLogin', $('#nickname').val().replace(/\s/g, "") , function(data){
            //Si se retorna true (este es el valor de callback desde el servidor) ingresamos al chat
            if(data){

              $('#loginListo').hide();//se oculta el registro
              $('#juegoListo').show();//se muestra la sala de chat  
              document.getElementById("botonLeft").disabled = true;
              document.getElementById("botonRight").disabled = true;
              document.getElementById("botonUp").disabled = true;
              document.getElementById("botonDown").disabled = true;

                //document.getElementById("enviarMensaje").disabled = true;   
            }
            //si no, se muestra el error y se solicita un nuevo ingreso de usuario
            else{
              window.alert("Nombre de usuario ya existente.\n Intente nuevamente.");
            }
          });
          //Vaciamos el input donde se ingreso el nick
          $('#nickname').val('');
        }
      });
      /*------------Boton Ingreso Usuario ----------------*/


      /*------------Boton MensajeChat ----------------*/

        $('#enviarMensajeChat').submit(function(){

          mensajeChat=$('#mensajeChat').val();
          palabras = mensajeChat.split(' ');
          //saco el comando sin el @, y lo llevo a minusculas
          comando=palabras[0].substring(1, palabras[0].length).toLowerCase(); 
          //Se identifica que es un comando

          if (mensajeChat.charAt(0) == '@'){ //debe existir otra palabra aparte del comando

            if (palabras.length>=2){ //son comandos que necesitan un argumento

                if (palabras[1].indexOf('::')!=-1) { //comando que necesita un :: en la segunda palabra argumento

                  switch(comando) {

                    case 'to':
                  //elimina el primer elemento del array
                    palabras.shift();
                  //debido a formato @to destino::mensaje......
                    usuarioDestino=palabras[0].split('::');
                  //con el segundo shift se tiene solo el mensaje
                    palabras.shift();
                    mensajeTotal.push(usuarioDestino[0]); //agrego el usuario
                    mensajeTotal.push(usuarioDestino[1]+' '+palabras.join(' ')) //agrego el mensaje

                  //envio a servidor un array {usuario,mensaje} para que no tenga que trabajar las variables
                  //el cliente se las pasa ya formateadas
                    socket.emit('sendingPrivateMessage', mensajeTotal); 
                    $('#mensajeChat').val('');
                    while(mensajeTotal.length > 0) {
                    mensajeTotal.pop();
                    }
                    return false;
                    break;

                  default:
                  socket.emit('sendingGeneralMessage', mensajeChat);
                  $('#mensajeChat').val('');
                  return false;
                  break;

                //fin swich
                }

              }//fin que comprueba :: en la segunda palabra

                else { //son comandos que necesitan un argumento pero no necesariamente deben tener ::

                switch(comando) {
                    
                    case 'sala':
                    palabras.shift();
                    palabras.join(' '); //vuelvo a juntar las palabras por espacio
                    socket.emit('requestForSala', palabras);
                    $('#mensajeChat').val('');
                    while(mensajeTotal.length > 0) {
                      mensajeTotal.pop();
                    }
                    return false;
                    break;

                  default:
                  socket.emit('sendingGeneralMessage', mensajeChat);
                  $('#mensajeChat').val('');
                  return false;
                  break;
            }//fin switch
            
          }//fin else

        }//fin que comprueba la cantidad de palabras ingresadas

        else{ //el proposito de esto es hacer comandos que no tengan argumentos por ejemplo @ayuda y @ver

                  switch(comando) {
                    
                    case 'ayuda':
                    $('#mensajesPosteados').append($('<p class="text-left">').text('Comandos: @ayuda-> Muestra los comandos disponibles'));
                    $('#mensajesPosteados').append($('<p class="text-left">').text('@to <nombreDestino>::<Mensaje> ->Envia un mensaje privado a destino'));
                    $('#mensajesPosteados').append($('<p class="text-left">').text('@sala-> Cambia de sala, en caso que no exista se crea una'));
                    $('#mensajesPosteados').append($('<p class="text-left">').text('@ver-> Muestra las salas de cada usuario'));
                    while(mensajeTotal.length > 0) {
                      mensajeTotal.pop();
                    }
                    return false;
                    break;

                    case 'ver':
                    socket.emit('requestForInfoUsuarios', palabras);
                    $('#mensajeChat').val('');
                    while(mensajeTotal.length > 0) {
                      mensajeTotal.pop();
                    }
                    return false;
                    break;

                    default:
                    socket.emit('sendingGeneralMessage', mensajeChat);
                    $('#mensajeChat').val('');
                    return false;
                    break;
            }//fin switch

      }//fin del caso de los comandos sin argumento
          
        }//fin if que comprueba el @

          else{

          socket.emit('sendingGeneralMessage', mensajeChat);
          $('#mensajeChat').val('');
          return false;
          }
        });

        socket.on('receivingGeneralMessage', function(msg){
        $('#mensajesPosteados').append($('<p class="text-left">').text(msg));
        $("#chat").scrollTop($("#chat")[0].scrollHeight); //Esto es necesario para que, para cada mensaje nuevo, se vea el ultimo enviado
      });

        socket.on('returnMensajePrivado', function(msg){
        $('#mensajesPosteados').append($('<p class="text-left">').text(msg));
        $("#chat").scrollTop($("#chat")[0].scrollHeight); //Esto es necesario para que, para cada mensaje nuevo, se vea el ultimo enviado
      });

      /*------------Boton MensajeChat ----------------*/

       /*------------Botones de movimiento ----------------*/

       //La idea es que tire un callback diciendo si el movimiento fue valido, en caso que si esconder los botones y cambiar de turno
       //de momento solo se hara mover el raton por el tablero, en caso que sea t se vuelve al inicio, y se restan puntos
       //agregart el puntaje por socket, validar que no se salga del tablero y cosas asi.

       $('#upMouse').submit(function(e){ //botones de movimiento upMouse, leftMouse, rightMouse, downMouse     
        
          e.preventDefault(); //Para evitar que se hagan refresh de la página, así solo enviamos el mensaje

          socket.emit('requestForUp', function(data){
            //Si se retorna true (este es el valor de callback desde el servidor) ingresamos al chat
            if(!data){
                window.alert("movimiento invalido");
            }
            //si no, se muestra el error y se solicita un nuevo ingreso de usuario
            else{
              document.getElementById("botonLeft").disabled = true;
              document.getElementById("botonRight").disabled = true;
              document.getElementById("botonUp").disabled = true;
              document.getElementById("botonDown").disabled = true;
              //window.alert("cambio de turno");
            }
          });

        });

        $('#downMouse').submit(function(e){ //botones de movimiento upMouse, leftMouse, rightMouse, downMouse     
        
          e.preventDefault(); //Para evitar que se hagan refresh de la página, así solo enviamos el mensaje

          socket.emit('requestForDown', function(data){
            //Si se retorna true (este es el valor de callback desde el servidor) ingresamos al chat
            if(!data){
                window.alert("movimiento invalido");
            }
            //si no, se muestra el error y se solicita un nuevo ingreso de usuario
            else{
              document.getElementById("botonLeft").disabled = true;
              document.getElementById("botonRight").disabled = true;
              document.getElementById("botonUp").disabled = true;
              document.getElementById("botonDown").disabled = true;
              //window.alert("cambio de turno");
            }
          });
          
        });
          $('#rightMouse').submit(function(e){ //botones de movimiento upMouse, leftMouse, rightMouse, downMouse     
        
          e.preventDefault(); //Para evitar que se hagan refresh de la página, así solo enviamos el mensaje

          socket.emit('requestForRight', function(data){
            //Si se retorna true (este es el valor de callback desde el servidor) ingresamos al chat
            if(!data){
                window.alert("movimiento invalido");
            }
            //si no, se muestra el error y se solicita un nuevo ingreso de usuario
            else{
              document.getElementById("botonLeft").disabled = true;
              document.getElementById("botonRight").disabled = true;
              document.getElementById("botonUp").disabled = true;
              document.getElementById("botonDown").disabled = true;
              //window.alert("cambio de turno");
            }
          });
          
        });

          $('#leftMouse').submit(function(e){ //botones de movimiento upMouse, leftMouse, rightMouse, downMouse     
        
          e.preventDefault(); //Para evitar que se hagan refresh de la página, así solo enviamos el mensaje

          socket.emit('requestForLeft', function(data){
            //Si se retorna true (este es el valor de callback desde el servidor) ingresamos al chat
            if(!data){
                window.alert("movimiento invalido");
            }
            //si no, se muestra el error y se solicita un nuevo ingreso de usuario
            else{
              document.getElementById("botonLeft").disabled = true;
              document.getElementById("botonRight").disabled = true;
              document.getElementById("botonUp").disabled = true;
              document.getElementById("botonDown").disabled = true;
              //window.alert("cambio de turno");
            }
          });
          
        });

      /*------------Fin Botones de movimiento ----------------*/

      /*------------Boton de Logout ----------------*/

        $('#logout').submit(function(){ //botones de movimiento upMouse, leftMouse, rightMouse, downMouse     
        
          //En este caso, se quiere refrescar la pagina, por ello no se previene
          //e.preventDefault(); //Para evitar que se hagan refresh de la página, así solo enviamos el mensaje

          socket.emit('requestForLogout');

        })

      /*------------Fin de Boton de Logout ----------------*/

      //emit('turnoParaJugar', confirmacion);

      socket.on('turnoParaJugar', function(data){
        //Siempre es true
        if (data==true){
              document.getElementById("botonLeft").disabled = false;
              document.getElementById("botonRight").disabled = false;
              document.getElementById("botonUp").disabled = false;
              document.getElementById("botonDown").disabled = false;
        }
        /*usuariosOnline = '';
        for(var i=0; i<data.length; i++){
          usuariosOnline += data[i]+'<br/>'
        }
        $('#panelConectados').html(usuariosOnline); //se guardan en el apartado dejado para los usuarios en el html*/
      });

      //Funcion que recibe informacion del servidor, imprime en el panel de conectados la lista obtenida desde el servidor
      socket.on('usuariosConectados', function(data){
        usuariosOnline = '';
        for(var i=0; i<data.length; i++){
          usuariosOnline += data[i]+'<br/>'
        }
        $('#panelConectados').html(usuariosOnline); //se guardan en el apartado dejado para los usuarios en el html
      });

      //Funcion que recibe informacion del servidor, imprime en el panel de salas, la lista obtenida desde el servidor
      socket.on('salasActivas', function(data){
        salasOnline = '';
        for(i=0; i<data.length; i++){
          salasOnline += data[i]+'<br/>'
        }
        $('#panelSalas').html(salasOnline); //se guardan en el apartado dejado para los usuarios en el html
      });

      //Funcion que recibe informacion del servidor, imprime en el apartado del usuario, la informacion obtenida desde el servior
      socket.on('infoUsuario', function(data){
        $('#bloqueUsuario').html('Jugador: '+data[0]+'<br/>'+'Sala Actual: '+data[1] + '<br/>'+'Puntaje: '+data[2]);
      });

      //Funcion que recibe informacion del servidor, muestra en el apartado del tablero, la matriz obtenida
      //reemplazando los valores por su respectivo icono, cada vez que se requiera
      socket.on('tableroSalaActual', function(data){
        //recepcionar matriz y mostrar por vista
        var datosFila;
        for (var fila=0;fila<10;fila++){
        datosFila = ''; //para cada fila, se resetea la variable
          for(var columna=0; columna<10; columna++){
            if (data[fila][columna]=='@'){
              datosFila += '<td style="max-height: 24px; max-width: 7px; min-width: 7px;"><img src="views/img/icon-mouse.png" alt="" style="width:25px; height:25px;"></td>';
              }
            else if(data[fila][columna]=='S'){
              datosFila += '<td style="max-height: 24px; max-width: 7px; min-width: 7px;"><img src="views/img/queso.gif" alt="" style="width:25px; height:25px;"></td>';
            }
            else if(data[fila][columna]=='T'){
              datosFila += '<td style="max-height: 24px; max-width: 7px; min-width: 7px;"><img src="views/img/Trap.gif" alt="" style="width:24px; height:24px;"></td>';
            }
            else if(data[fila][columna]=='O'){
            datosFila += '<td>_</td>'; //<td>1</td>
            }
            else //question-icon.png
              {
              datosFila += '<td style="min-height: 24px;  min-width: 7px;"><img src="views/img/question-icon.png" alt="" ></td>';
            }
          }//termino for por columna
          $('#fila'+fila).html(datosFila); //se reemplaza la informacion de las columnas a la fila actual
        }//termino for por fila
      });

      //Funcion que recibe informacion del servidor, obtiene un mensaje final y es emitido en la pantalla de la vista
      //luego se auto-actualiza la pantalla, ingresando de nuevo al apartado de logeo
      socket.on('receivingFinalMessage', function(data){
        window.alert(data);
      });

/*Fin main()*/
}