import * as net from "net";

let server = net.createServer({ pauseOnConnect: true });
server.on("error", (err) => {
  throw err;
});
server.on('connection', newConn);
server.listen({host: '127.0.0.1', port: 1234});


class TCPListener {
  constructor(socket, reader = null) {
    this.socket = socket;
    this.reader = reader;
  }
}

function soListen(){};
function soAccept(){};
/*
 * TCPConn is a class to store data for the socket object, that is Promise-based.
 *
 * */
class TCPConn {
  constructor(socket, reader = null, err = null, ended = false) {
    this.socket = socket;
    this.reader = reader;
    this.err = err;
    this.ended = ended;
  }
}

/* serveClient
 *
 * read data from client connection, log the data and write the data back to client
 *
 * given a socket, the function will serve a client by first initializing a TCP connection 
 * object from the socket provided. It then continuously reads from the connection async. 
 * If the data is every returned with length == 0 then the event loop is terminated. At this point
 * we respond back the clinet by writting data back to the client.
 * */
async function serveClient(socket) {
  const conn = soInit(socket);
  while (true) {
    const data = await soRead(conn);
    if (data.length === 0) {
      console.log("end connection");
      break;
    }
    console.log("data", data);
    await soWrite(conn, data);
  }
}

/* newConn
 *
 * serves data the client once connection has been established, checks for errors and destroys if neccesary
 * */
async function newConn(socket) {
  console.log("new connection", socket.remoteAddress, socket.remotePort);
  try {
    await serveClient(socket);
  } catch (exc) {
    console.log("exception:", exc);
  } finally {
    socket.destroy();
  }
}

/* soInit
 *
 * The soInit function wraps a socket object from net.socket
 *
 * To initialize a socket in this case means adding a few callbacks for socket events:
 *
 * "data" - for the data event we first pause incoming events and use the conn.reader.resolve
 *          to resolve the current data event. Once done we set reader to null to indicate this.
 *
 * "end" - for the "end" event we simply resolve with empty byte and set reader to null.
 *
 * "error" - for the "error" event we reject and set reader to null.
 * 
 * return: we return the new TCPconn with socket as socket property and corresponding socket callbacks.
 * */
function soInit(socket) {
  // create a tcp connection object
  const conn = new TCPConn(socket);

  socket.on("data", (data) => {
    console.assert(conn.reader);
    conn.socket.pause();
    conn.reader.resolve(data);
    conn.reader = null;
  });

  socket.on("end", () => {
    conn.ended = true;
    if (conn.reader) {
      conn.reader.resolve(Buffer.from(""));
      conn.reader = null;
    }
  });

  socket.on("error", (err) => {
    conn.err = err;
    if (conn.reader) {
      conn.reader.reject(err);
      conn.reader = null;
    }
  });
  return conn;
}

function soRead(conn) {
  console.assert(!conn.reader); // no concurrent calls

  return new Promise((resolve, reject) => {
    if (conn.err) {
      reject(conn.err);
      return;
    }

    if (conn.ended) {
      resolve(Buffer.from(""));
      return;
    }
    conn.reader = { resolve: resolve, reject: reject };
    conn.socket.resume();
  });
}

function soWrite(conn, data) {
  console.assert(data.length > 1);

  return new Promise((resolve, reject) => {
    if (conn.err) {
      reject(conn.err);
      return;
    }

    conn.socket.write(data, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
