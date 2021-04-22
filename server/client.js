const io = require("socket.io-client");


const socket = io("ws://localhost:80");

socket.on("connect", () => {
  // or with emit() and custom event names
  console.log("Client Emitting")
  socket.emit("join", "NodeJS_Client_ID")
  socket.emit("message", "Hello Bogdan!", { "mr": "john" }, Uint8Array.from([1, 2, 3, 4]));
  console.log("Client Emitted")
});

// handle the event sent with socket.send()
socket.on("message", data => {
  console.log("Client Getting a message: ")
  console.log(data);
});

// handle the event sent with socket.emit()
socket.on("greetings", (elem1, elem2, elem3) => {
  console.log(elem1, elem2, elem3);
});

socket.on("log", data => {
  console.log({ data })
})