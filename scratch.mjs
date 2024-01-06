import * as net from "net";

/* serveClient
 *
 * read data from client connection, log the data and write the data back to client
 * */
async function serveClient(socket) {
	const conn = new TCPConn(socket);
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


let server = net.createServer({pauseOnConnect: true});
server.on("error", (err) => { throw err; })
server.on("connection", newConn);
	server.listen({"host": "127.0.0.1", "port": "1234"});

/* 
 * TCPConn is a class to store data for the socket object. 
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


/* soInit 
 *
 * The soInit function wraps a socket object from net.socket 
 * */
function soInit(socket) {
	// create a tcp connection object
	const conn = new TCPConn(socket);
	
	socket.on("data", (data) => {
		console.assert(conn.reader);
		conn.socket.pause();
		conn.reader.resolve(data);
		conn.reader = null;
	})

	socket.on("end", () => {
		conn.ended = true;	
		if (conn.reader) {
			conn.reader.resolve(Buffer.from(""));
			conn.reader = null;
		}	
	})

	socket.on("error", (error)=> {
		conn.err = err;
		if (conn.reader) {
			conn.reader.reject(err);
			conn.reader = null;
		}
	})
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
		conn.reader = {resolve: resolve, reject: reject};
		conn.resume();

	})
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
		})
	})
}

