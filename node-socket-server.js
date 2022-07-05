// 
// SERVER
// 
// Node.js socket server script
const net = require('net');

// Create a server object
const server = net.createServer((socket) => {
  socket.on('data', (data) => {
    console.log(data.toString());
  });
  socket.write('SERVER: Hello! This is server speaking.');
  // socket.end('SERVER: Closing connection now.');
}).on('error', (err) => {
  console.error(err);
});

// Open server on port 9898
server.listen(9898, () => {
  console.log('opened server on', server.address().port);
});


// 
// CLIENT
// 
// Node.js socket client script
const net = require('net');

// Connect to a server @ port 9898
const client = net.createConnection({ port: 9898 }, () => {
  console.log('CLIENT: I connected to the server.');
  client.write('CLIENT: Hello this is client!');
});

client.on('data', (data) => {
  console.log(data.toString());
});

client.on('end', () => {
  console.log('CLIENT: I disconnected from the server.');
});