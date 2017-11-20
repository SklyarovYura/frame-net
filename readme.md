####framed-net

#  
server
```javascript
const { frame, Message, Queue } = require('framed-net');

const queue    = new Queue();
const server   = new net.createServer({});

server.on('connection', ( socket )=> {
  frame( socket )
    .on('message', ( data )=> {
        queue.push(data, socket);
      });
});

queue.on( 'next', ( data, socket )=> {
  socket.send( new Message( { data: Buffer.from("send data to client") } ) );
});
```
client

```javascript
const { frame, Message, Queue } = require('framed-net');

const queue    = new Queue();
const client   = new net.Socket({});

client.on('connection', ( socket )=> {
  protocol( socket )
    .on('message', ( data )=> {
        queue.push(data);
      });
});

queue.on( 'next', ( data  )=> {
  socket.send(  new Message( { data: Buffer.from("send data to server") } ) );
});
```