var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

io.set('heartbeat timeout', 3000);
io.set('heartbeat interval', 1000);

var colorPairsPicker = require('color-pairs-picker');


function getRandomColorPair () {
  var base = '';
  for (var i=0; i<6; i++){
    base += '0123456789abcdef'[Math.floor(Math.random()*16)];
  }
  return colorPairsPicker(base, {contrast: 3});
}

// var scoringSnapshot = {
//   score: 0,
//   multiplier: 0,
//   time: (new Date()).getTime()
// };

// TODO remove?
var clients = {};
var allPaddles = {};
var balls = {};

var constants = {
  outOfBoundsRadius: 150
};

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

setInterval(function(){console.log('cur paddles\n', allPaddles, '\n');}, 10000);

var initBallVel = 0.07;



io.on('connection', function(socket){
  console.log('A new player connected, id: '+socket.id);
  
  // for (var id in so)
  var colorPair = getRandomColorPair();

  clients[socket.id] = socket;
  

  var newBall = {
    owner: socket.id,
    x: 0,
    y: 0,
    radius: 20,
    color: colorPair.fg,
    outlineColor: colorPair.bg,
    // color: 'red',
    // outlineColor: 'black',
    vAngle: 10,
    // vMagnitude: 0.03
    vMagnitude: initBallVel
  };

  newBall.snapshot = {
    owner: socket.id,
    x: newBall.x,
    y: newBall.y,
    time: (new Date()).getTime(),
    vAngle: newBall.vAngle,
    vMagnitude: newBall.vMagnitude    
  };

  balls[socket.id] = newBall;

  predictBallOutOfBounds(newBall.owner);

  console.log('broadcasting new ball: ', newBall);
  socket.broadcast.emit('new-ball', newBall);

  socket.emit('initialized', {
    yourId: socket.id,
    otherPaddles: allPaddles,
    balls: balls
  });


  // ??
  // io.emit('player-connected', socket.id);
  socket.broadcast.emit('player-connected', socket.id);

  socket.on('disconnect', function(){
    console.log('A player has disconnected, id: ', socket.id);
    delete clients[socket.id];
    delete allPaddles[socket.id];
    delete balls[socket.id];
    clearTimeout(outOfBoundsTimeouts[socket.id]);
    socket.broadcast.emit('player-disconnected', socket.id);
  });

  socket.on('ball-update', function(ballInfo) {
    console.log('received and reemitting ball update: ', ballInfo);
    balls[ballInfo.owner].snapshot = ballInfo;
    predictBallOutOfBounds(ballInfo.owner);
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

var outOfBoundsTimeouts = {};

function setOutOfBoundsTimeout(time, ballId){

  clearTimeout(outOfBoundsTimeouts[ballId]);
  outOfBoundsTimeouts[ballId] = setTimeout(function(){
    // console.log('players: ', players);

    // console.log('setting timeout for id:', ballId);
    // showBalls();
    // // protect from race conditions
    // if (!players[ballId] || !players[ballId].ball){
    //   return;
    // }
    var ball = balls[ballId];
    // var ball = balls[ballId];

    // if (ball === undefined){return;}
    ball.x = 0;
    ball.y = 0;
    ball.vAngle = Math.random()*2*Math.PI;
    ball.vMagnitude = initBallVel;
    // ball.time = (new Date()).getTime();
// return {
//   owner: ball.owner,
//   x: ball.x,
//   y: ball.y,
//   time: (new Date()).getTime(),
//   vAngle: ball.vAngle,
//   vMagnitude: ball.vMagnitude
// };
    ball.snapshot = {
      owner: ball.owner,
      x: ball.x,
      y: ball.y,
      time: (new Date()).getTime(),
      vAngle: ball.vAngle,
      vMagnitude: ball.vMagnitude
    };
    console.log('ball is out of bounds');
    io.emit('ball-update', ball.snapshot);
    predictBallOutOfBounds(ball.owner);
    // emitBallUpdate(ball.snapshot);
  }, time);
}

function predictBallOutOfBounds (ballId) {
  console.log('predicting ball oob: ', ballId);

  var ballSnapshot = balls[ballId].snapshot;

  // effective radius
  var r = constants.outOfBoundsRadius + balls[ballId].radius

  // Solve x(t)^2 + y(t)^2 = r^2
  var a = ballSnapshot.vMagnitude*ballSnapshot.vMagnitude;
  var b = 2*ballSnapshot.vMagnitude*(ballSnapshot.x*Math.cos(ballSnapshot.vAngle) + ballSnapshot.y*Math.sin(ballSnapshot.vAngle));
  var c = ballSnapshot.x*ballSnapshot.x + ballSnapshot.y*ballSnapshot.y - r*r;

  var determinant = b*b - 4*a*c;
  // console.log('det', determinant);
  if (determinant < 0){
    setOutOfBoundsTimeout(0, ballId);     // ball already out of bounds
  } else {
    var t = (-b + Math.sqrt(determinant))/(2*a);
    // account for time discrepency
    var discrepency = (new Date()).getTime() - ballSnapshot.time;
    console.log('discrepency:', discrepency);

    t -= discrepency;
    setOutOfBoundsTimeout(t, ballId);
    console.log('prediction oob in: ', t);
  }
}
// function setOutOfBoundsTimeout(time, ballId){




// function publishBallUpdate(){

// }
var port = process.env.PORT || 3000;
http.listen(port, function(){
  console.log('listening on *:', port);
});
