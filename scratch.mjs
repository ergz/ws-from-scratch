import * as net from "net";

function newConn(socket) {
	console.log("new connection", socket.remoteAddress, socket.remotePort);
	socket.on("end", () => {
		console.log("EOF");
	})

	socket.on("data", (data) => {
		console.log("data", data);
		socket.write(data);

		if (data.includes("q")) {
			console.log("closing");
			socket.end();
		}
	})
}

let server = net.createServer({pauseOnConnect: true});
server.on("error", (err) => { throw err; })
server.on("connection", newConn);
server.listen({"host": "127.0.0.1", "port": "1234"});


class TCPConn {
	constructor(socket, reader = null, err = null, ended = false) {
		this.socket = socket;
		this.reader = reader;
		this.err = null;
		this.ended = null;
	}
}

function soRead(conn) {
	console.assert(!conn.reader); // assert connection is not already handling a promise
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
		conn.socket.resume();
	});
}
function soWrite(conn, data) {
	console.assert(data.length > 0);
	return new Promise((resolve, reject) => {
		if (conn.err) {
			reject(conn.err);
			return;
		}
	})
	conn.socket.write(data, (err) => {
		if (err) {
			reject(err);
		} else {
			resolve();
		}
	})
}
function soInit(socket) {
	const conn = new TCPConn(socket, reader = null, err = null, ended = false);
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

	socket.on("errpr", (err) => {
		conn.err = err;
		if (conn.reader) {
			conn.reader.reject(err);
			conn.reader = null;
		}
	})
	return conn;
}


