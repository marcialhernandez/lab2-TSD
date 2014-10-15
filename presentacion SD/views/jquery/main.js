  /*var socket=io();
  var usuarioLocal;
  var ingresado=false;*/

function main(){

        $('#juegoListo').hide();//se oculta el juego hasta que se haya logeado
        //$('#chat').scrollTop = $('#chat').scrollHeight;

        var socket=io();

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
          $nick.val('');
        }
      });
      /*------------Boton Ingreso Usuario ----------------*/


      /*------------Boton MensajeChat ----------------*/

        $('#enviarMensajeChat').submit(function(){
          socket.emit('sendingGeneralMessage', $('#mensajeChat').val());
          $('#mensajeChat').val('');
          return false;
        });
        socket.on('receivingGeneralMessage', function(msg){
        $('#mensajesPosteados').append($('<p class="text-left"> <\br>').text(msg));
      });

      /*------------Boton MensajeChat ----------------*/

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