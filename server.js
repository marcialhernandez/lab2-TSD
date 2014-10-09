var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
//---------------------------------------------------
var chatServer = require('./lib/chatGrupal');
chatServer.listen(server);
//---------------------------------------------------
var cache = {};

//para manejar el error 404 cuando un archivo requerido no existe
function send404(response) {
	response.writeHead(404, {'Content-Type': 'text/plain'});
	response.write('Error 404: resource not found.');
	response.end();
}

//Para manejar el contenido de archivos, escribiendo primero los headers del archivo antes de enviarlo
function sendFile(response, filePath, fileContents) {
	response.writeHead(200,{"content-type": mime.lookup(path.basename(filePath))});
	response.end(fileContents);
}

//para revisar si el archivo solicitado esta en cache antes de enviarlo
//si esta, lo envia desde ahi, caso contrario lo busca, caso en que no este, llama a la funcion 404
function serveStatic(response, cache, absPath) {
	if (cache[absPath]) {
		sendFile(response, absPath, cache[absPath]);
	} else {
		fs.e xists(absPath, function(exists) {
			if (exists) {
				fs.readFile(absPath, function(err, data) {
					if (err) {
						send404(response);
					} else {
						cache[absPath] = data;
						sendFile(response, absPath, data);
					}
				});
			} else {
				send404(response);
			}
		});
	}
}

var server = http.createServer(function(request, response) {
	var filePath = false;
	if (request.url == '/') {
		filePath = 'public/index.html';
	} else {
		filePath = 'public' + request.url;
	}
	var absPath = './' + filePath;
	serveStatic(response, cache, absPath);
});

server.listen(3000, function() {
	console.log("Server listening on port 3000.");
});