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
          if (mensajeChat.charAt(0) == '@' && palabras[1].indexOf('::')!=-1) {

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
        var html = '';
        for(i=0; i<data.length; i++){
          html += data[i]+'<br/>'
        }
        $('#panelConectados').html(html); //se guardan en el apartado dejado para los usuarios en el html
      });

/*Fin main()*/
}


  /* ----------------------------Codigo basura-------------------------------------------------------
  $('#juegoListo').addClass('hidden');

  $('#ingresandoNickName').submit(function(){
    usuarioLocal=$('#nickname').val();
    //$('#loginListo').hide();
    //$('#juegoListo').show();
    socket.emit('requestForLogin', usuarioLocal);
    $('#ingresandoNickName').append($('<h4>').text('enviando...'));
        //$('#loginListo').hide();
    //$('#juegoListo').show();
    $('#nickname').val('');
    });

  //elemento.hide();
  //elemento.show();

    socket.on('respondForLogin', function(respuestaLogin){
    if (respuestaLogin==0){
      $('#ingresandoNickName').append($('<h4>').text('Ingresando al juego...'));
      ingresado=true;
      //var url = "views/index.html";    
      //$(location).attr('href',"views/index.html");
      //mainJuego();
    }

    else{
      $('#ingresandoNickName').append($('<h4>').text('El usuario ya existe...'));
      //alert('usuario Ya existe');
    }
})*/