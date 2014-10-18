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

          if (mensajeChat.charAt(0) == '@' && palabras.length>=2){ //debe existir otra palabra aparte del comando

                if (palabras[1].indexOf('::')!=-1) {

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
                    $('#mensajeChat').val(' ');
                    while(mensajeTotal.length > 0) {
                    mensajeTotal.pop();
                    }
                    return false;
                    break;

                  default:
                  socket.emit('sendingGeneralMessage', mensajeChat);
                  $('#mensajeChat').val(' ');
                  return false;
                  break;

                //fin swich
                }
              }

                else {

                switch(comando) {
                    
                    case 'sala':
                    palabras.shift();
                    palabras.join(' '); //vuelvo a juntar las palabras por espacio
                    socket.emit('requestForSala', palabras);
                    $('#mensajeChat').val(' ');
                    while(mensajeTotal.length > 0) {
                      mensajeTotal.pop();
                    }
                    return false;
                    break;

                  default:
                  socket.emit('sendingGeneralMessage', mensajeChat);
                  $('#mensajeChat').val(' ');
                  return false;
                  break;

            //fin switch
            }
            //fin else
          }
          //fin if que comprueba el @
        }

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

      socket.on('usuariosConectados', function(data){
        usuariosOnline = '';
        for(i=0; i<data.length; i++){
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

/*Fin main()*/
}