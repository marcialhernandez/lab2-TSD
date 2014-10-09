
//objeto chat, identifica al usuario por el socket utilizado
var Chat = function(socket) {
	this.socket = socket;
};

//hereda de objeto chat, envia un diccionario que representa mensaje, enviandolo al servidor con emit; id='message'
Chat.prototype.sendMessage = function(room, text) {
	var message = {
		room: room,
		text: text
	};
	this.socket.emit('message', message);
};

//hereda de objeto chat, envia una peticion de cambio de sala, enviandolo al servidor con emit; id='join'
Chat.prototype.changeRoom = function(room) {
	this.socket.emit('join', {newRoom: room});
};

//hereda  de objeto chat, procesa un comando en caso que exista
//primero splitea por espacios, y saca un substring del primer elemento, si coincide con un comando...
Chat.prototype.processCommand = function(command) {
	var words = command.split(' ');
	var command = words[0]
	.substring(1, words[0].length)
	.toLowerCase();
	var message = false;
	swich(command) {

		case 'join':
			words.shift();//elimina el primer elemento del array
			var room = words.join(' '); //concatena todos los elementos del array, separandolos por el argumento, e sta vez por espacio
			this.changeRoom(room); //aplica la funcion changeRoom
			break;

		case 'nick':
			words.shift();
			var name = words.join(' ');
			this.socket.emit('nameAttempt', name);
			break;

		default:
			message = 'Unrecognized command.';
			break;
	}
	return message;
};