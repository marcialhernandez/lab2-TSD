var usuarioLocal;

function main(){
  var socket=io();
  $('#ingresandoNickName').submit(function(){
    usuarioLocal=$('#entrada1').val();
    socket.emit('requestForLogin', $('#entrada1').val());
    $('#ingresandoNickName').append($('<h4>').text('enviando...'));
    $('#entrada1').val('');
})
    socket.on('respondForLogin', function(respuestaLogin){
    if (respuestaLogin==0){
      $('#ingresandoNickName').append($('<h4>').text('Ingresando al juego...'));
      var url = "html/index.html";    
      $(location).attr('href',url);
      //alert('Ingresando...');
    }
    else{
      $('#ingresandoNickName').append($('<h4>').text('El usuario ya existe...'));
      //alert('usuario Ya existe');
    }
  });
}