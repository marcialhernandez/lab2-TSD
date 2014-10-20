  /*var socket=io();
  var usuarioLocal;
  var ingresado=false;*/

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
          socket.emit('requestForLogin', $('#nickname').val(), function(data){
            //Si se retorna true (este es el valor de callback desde el servidor) ingresamos al chat
            if(data){
              $('#loginListo').hide();//se oculta el registro
              $('#juegoListo').show();//se muestra la sala de chat  
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
      });

        socket.on('returnMensajePrivado', function(msg){
        $('#mensajesPosteados').append($('<p class="text-left">').text(msg));
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
              window.alert("cambio de turno");
            }
          });
          //Vaciamos el input donde se ingreso el nick
        });
      /*------------Fin Botones de movimiento ----------------*/

      socket.on('usuariosConectados', function(data){
        usuariosOnline = '';
        for(var i=0; i<data.length; i++){
          usuariosOnline += data[i]+'<br/>'
        }
        $('#panelConectados').html(usuariosOnline); //se guardan en el apartado dejado para los usuarios en el html
      });

      socket.on('salasActivas', function(data){
        salasOnline = '';
        for(i=0; i<data.length; i++){
          salasOnline += data[i]+'<br/>'
        }
        $('#panelSalas').html(salasOnline); //se guardan en el apartado dejado para los usuarios en el html
      });

      socket.on('infoUsuario', function(data){
        $('#bloqueUsuario').html('Jugador: '+data[0]+'<br/>'+'Sala Actual: '+data[1]);
      });

      socket.on('tableroSalaActual', function(data){
        //recepcionar matriz y mostrar por vista
        var datosFila;
        for (var fila=0;fila<10;fila++){
        datosFila = ''; //para cada fila, se resetea la variable
          for(var columna=0; columna<10; columna++){
            datosFila += '<td>'+data[fila][columna]+'</td>' //<td>1</td>
          }//termino for por columna
          $('#fila'+fila).html(datosFila); //se reemplaza la informacion de las columnas a la fila actual
        }//termino for por fila
      });

/*Fin main()*/
}