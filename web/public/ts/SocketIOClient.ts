import io, { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

export default class SocketIOClient {
  socket: Socket;
  clientId: string;
  constructor() {
    this.socket = io('ws://localhost:80');
    this.socket.on('connect', () => {
      // or with emit() and custom event names
      console.log('Connected.');
    });
    this.clientId = uuidv4();

    this.socket.on('greetings', (greeting: string) => {
      console.log(`Server was greeted: ${greeting}`);
    });
    this.socket.on('join', (clientId) => {
      console.log(`${clientId} wants to join`);
      this.joinRoom();
    });
  }

  joinRoom() {
    console.log('Joining room...');
    this.socket.emit('join', this.clientId);
  }
}
