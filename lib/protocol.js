const { Message } = require('./message');
const FLS = 4; // frame length size

function frame( socket ) {

  const requests = new Map();

  let receiver; 
  let frameLength;

  socket.fetch = ( message, timeout = 0 )=> {

    if( Buffer.isBuffer( message ) ) {
      message = new Message( { body: message , type: 1, timeout } );
    }

    if( message.type === 1 ) {
      const key = message.asciiKey;
      const timeout = message.timeout;

      if( timeout ) {
        return Promise.race(
          [
            new Promise(( resolve, reject )=> {
              requests.set( key, { resolve, reject } );
              socket.write( message.valueOf() );
            }),
            new Promise( ( resolve,reject )=> {
              const item = requests.get( key );
              item.timeoutObj = setTimeout( ()=> {
                requests.delete( key );
                item.timeoutObj = null;
                reject( new Error('timeout') );
              },timeout );
            })
          ]
        );

      }
      else {
        return new Promise( ( resolve, reject )=> {
          requests.set( key, { resolve, reject } );
          socket.write( message.valueOf() );
        });
      }
    }
    else {
      throw new Error('message type not request');
    }

  };

  socket.send = ( message )=> {

    if( Buffer.isBuffer( message ) ) { 
      message = new Message( { body: message  } );
    }

    if( message.income && message.type === 1 ) {
      message.type = 2;
    }

    socket.write(message.valueOf());

  };

  socket.on('data', ( chunk )=> {
    /**
     * @type {Buffer}
     */
    let buffer;

    buffer = receiver ? Buffer.concat( [ receiver, chunk ] ) : chunk;

    if( !frameLength ) {
      if (buffer.length > FLS ) {
        frameLength = buffer.readUInt32BE(0);
      }
    }

    while(frameLength <= buffer.length) {

      const message = new Message( buffer.slice( 0, frameLength ), true );

      if( message.type === 2 ) {

        const key = message.asciiKey;
        const item = requests.get( key );
        if( item ) {
          if( item.timeoutObj ) {
            clearTimeout( item.timeoutObj );
          }
          item.timeoutObj = null;
          requests.delete( key );
          item.resolve( message );
        }
        else {
          socket.emit( 'lost-responses', message );
        }

      }
      else {
        socket.emit( 'message', message );
      }

      buffer = buffer.slice(frameLength);

      if( buffer.length > FLS ) {
        frameLength = buffer.readUInt32BE(0);
      }
      else {
        frameLength = undefined;
        break;
      }

    }
    
    receiver = buffer.length ? buffer : undefined;

  });

  return socket;

}

module.exports = { frame };
