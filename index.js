var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// TODO remove?
var clients = {};
var allPaddles = {};

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  console.log('A new player connected, id: '+socket.id);
  
  // for (var id in so)

  clients[socket.id] = socket;
  
  socket.emit('initialized', {
    yourId: socket.id,
    otherPaddles: allPaddles
  });

  setInterval(function(){console.log('cur paddles\n', allPaddles, '\n');}, 1000);

  // ??
  // io.emit('player-connected', socket.id);
  socket.broadcast.emit('player-connected', socket.id);

  socket.on('disconnect', function(){
    console.log('A player has disconnected, id: ', socket.id);
    delete clients[socket.id];
    delete allPaddles[socket.id];
    socket.broadcast.emit('player-disconnected', socket.id);
  });

  socket.on('ball-update', function(ballInfo) {
    socket.broadcast.emit('ball-update', ballInfo);
  });

  // paddleInfo expected to be of the form
  /*
  {
    paddleId: someInt (socketid)
    paddleInfo: somePaddleInformation
  }
  */
  socket.on('paddle-update', function(paddleInfo) {
    allPaddles[paddleInfo.playerId] = paddleInfo.paddle;
    socket.broadcast.emit('paddle-update', paddleInfo);
  });
});



// function publishBallUpdate(){

// }
var port = process.env.PORT || 3000;
http.listen(port, function(){
  console.log('listening on *:', port);
});
