function main(){
	var socket = io();
    $('form').submit(function(){
    socket.emit('chat message', $('#mensajeChat').val());
    $('#mensajeChat').val('');
    return false;
    });
    socket.on('chat message', function(msg){
    $('#mensajesPosteados').append($('<li>').text(msg));
    });
}

