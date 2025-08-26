/**
 * Test client untuk testing chat functionality
 * Jalankan dengan: node examples/test-client.js
 */

const io = require('socket.io-client');

// Konfigurasi
const SERVER_URL = 'http://localhost:3000';
const NUM_CLIENTS = 3;
const TEST_DURATION = 30000; // 30 detik

class TestClient {
  constructor(id) {
    this.id = id;
    this.socket = null;
    this.messageCount = 0;
    this.connected = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = io(SERVER_URL, {
        auth: {
          token: `test-token-${this.id}`
        }
      });

      this.socket.on('connect', () => {
        console.log(`[Client ${this.id}] Connected: ${this.socket.id}`);
        this.connected = true;
        
        // Join sebagai user
        this.socket.emit('user:join', {
          name: `TestUser-${this.id}`,
          email: `test${this.id}@example.com`,
          status: 'online'
        });

        // Join room
        this.socket.emit('join', 'test-room');
        
        resolve();
      });

      this.socket.on('disconnect', () => {
        console.log(`[Client ${this.id}] Disconnected`);
        this.connected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error(`[Client ${this.id}] Connection error:`, error.message);
        reject(error);
      });

      this.socket.on('message', (message) => {
        this.messageCount++;
        console.log(`[Client ${this.id}] Received message: ${message.text} from ${message.user.name}`);
      });

      this.socket.on('users:list', (users) => {
        console.log(`[Client ${this.id}] Users list: ${users.length} users`);
      });

      this.socket.on('user:joined', (user) => {
        console.log(`[Client ${this.id}] User joined: ${user.name}`);
      });

      this.socket.on('user:left', (data) => {
        console.log(`[Client ${this.id}] User left: ${data.userName}`);
      });

      this.socket.on('typing:start', (data) => {
        console.log(`[Client ${this.id}] ${data.userName} is typing...`);
      });

      this.socket.on('typing:stop', (data) => {
        console.log(`[Client ${this.id}] ${data.userName} stopped typing`);
      });
    });
  }

  sendMessage(text) {
    if (this.connected) {
      this.socket.emit('message', {
        room: 'test-room',
        text,
        meta: { timestamp: Date.now() }
      });
      console.log(`[Client ${this.id}] Sent message: ${text}`);
    }
  }

  startTyping() {
    if (this.connected) {
      this.socket.emit('typing:start', { room: 'test-room' });
    }
  }

  stopTyping() {
    if (this.connected) {
      this.socket.emit('typing:stop', { room: 'test-room' });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
    }
  }

  getStats() {
    return {
      id: this.id,
      connected: this.connected,
      messageCount: this.messageCount,
      socketId: this.socket?.id
    };
  }
}

class ChatTester {
  constructor() {
    this.clients = [];
    this.testInterval = null;
    this.messageInterval = null;
    this.typingInterval = null;
  }

  async start() {
    console.log('🚀 Starting chat test...');
    console.log(`📊 Creating ${NUM_CLIENTS} test clients`);
    console.log(`⏱️  Test duration: ${TEST_DURATION / 1000} seconds`);
    console.log('');

    // Buat dan connect semua clients
    for (let i = 0; i < NUM_CLIENTS; i++) {
      const client = new TestClient(i + 1);
      this.clients.push(client);
      
      try {
        await client.connect();
        // Delay kecil antara connections
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to connect client ${i + 1}:`, error.message);
      }
    }

    console.log(`✅ All clients connected: ${this.clients.filter(c => c.connected).length}/${NUM_CLIENTS}`);
    console.log('');

    // Mulai test scenarios
    this.startMessageTest();
    this.startTypingTest();
    this.startRandomActions();

    // Set timer untuk stop test
    setTimeout(() => {
      this.stop();
    }, TEST_DURATION);
  }

  startMessageTest() {
    // Kirim pesan setiap 2 detik
    this.messageInterval = setInterval(() => {
      const randomClient = this.getRandomClient();
      if (randomClient && randomClient.connected) {
        const messages = [
          'Hello everyone!',
          'How are you doing?',
          'This is a test message',
          'Testing the chat system',
          'Message from test client',
          'Random message here',
          'Another test message',
          'Chat is working well!'
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        randomClient.sendMessage(randomMessage);
      }
    }, 2000);
  }

  startTypingTest() {
    // Simulasi typing indicators setiap 5 detik
    this.typingInterval = setInterval(() => {
      const randomClient = this.getRandomClient();
      if (randomClient && randomClient.connected) {
        randomClient.startTyping();
        
        // Stop typing setelah 2 detik
        setTimeout(() => {
          randomClient.stopTyping();
        }, 2000);
      }
    }, 5000);
  }

  startRandomActions() {
    // Random actions setiap 10 detik
    this.testInterval = setInterval(() => {
      const action = Math.floor(Math.random() * 3);
      const randomClient = this.getRandomClient();
      
      if (!randomClient || !randomClient.connected) return;

      switch (action) {
        case 0:
          // Change room
          const rooms = ['test-room', 'general', 'random'];
          const randomRoom = rooms[Math.floor(Math.random() * rooms.length)];
          randomClient.socket.emit('leave', 'test-room');
          randomClient.socket.emit('join', randomRoom);
          console.log(`[Client ${randomClient.id}] Changed to room: ${randomRoom}`);
          break;
          
        case 1:
          // Update status
          const statuses = ['online', 'away', 'busy'];
          const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
          randomClient.socket.emit('user:status', randomStatus);
          console.log(`[Client ${randomClient.id}] Status changed to: ${randomStatus}`);
          break;
          
        case 2:
          // Send private message
          const otherClient = this.getRandomClient();
          if (otherClient && otherClient.id !== randomClient.id) {
            randomClient.socket.emit('message:private', {
              toUserId: otherClient.socket.id,
              text: `Private message from Client ${randomClient.id}`,
              meta: { timestamp: Date.now() }
            });
            console.log(`[Client ${randomClient.id}] Sent private message to Client ${otherClient.id}`);
          }
          break;
      }
    }, 10000);
  }

  getRandomClient() {
    const connectedClients = this.clients.filter(c => c.connected);
    if (connectedClients.length === 0) return null;
    return connectedClients[Math.floor(Math.random() * connectedClients.length)];
  }

  stop() {
    console.log('');
    console.log('🛑 Stopping chat test...');
    
    // Clear intervals
    if (this.testInterval) clearInterval(this.testInterval);
    if (this.messageInterval) clearInterval(this.messageInterval);
    if (this.typingInterval) clearInterval(this.typingInterval);
    
    // Disconnect all clients
    this.clients.forEach(client => {
      client.disconnect();
    });
    
    // Print stats
    this.printStats();
    
    console.log('✅ Test completed!');
    process.exit(0);
  }

  printStats() {
    console.log('');
    console.log('📊 Test Results:');
    console.log('================');
    
    this.clients.forEach(client => {
      const stats = client.getStats();
      console.log(`Client ${stats.id}: ${stats.connected ? '✅ Connected' : '❌ Disconnected'} | Messages: ${stats.messageCount} | Socket: ${stats.socketId}`);
    });
    
    const totalMessages = this.clients.reduce((sum, client) => sum + client.messageCount, 0);
    const connectedClients = this.clients.filter(c => c.connected).length;
    
    console.log('');
    console.log(`Total Messages: ${totalMessages}`);
    console.log(`Connected Clients: ${connectedClients}/${NUM_CLIENTS}`);
    console.log(`Average Messages per Client: ${(totalMessages / NUM_CLIENTS).toFixed(2)}`);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, stopping test...');
  if (global.tester) {
    global.tester.stop();
  }
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, stopping test...');
  if (global.tester) {
    global.tester.stop();
  }
});

// Start test
async function main() {
  try {
    const tester = new ChatTester();
    global.tester = tester;
    await tester.start();
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(SERVER_URL);
    if (response.ok) {
      console.log('✅ Server is running');
      return true;
    }
  } catch (error) {
    console.error('❌ Server is not running. Please start the server first:');
    console.error('   npm run example');
    console.error('   or');
    console.error('   npm run example:auth');
    return false;
  }
}

// Start test if server is running
checkServer().then(running => {
  if (running) {
    main();
  } else {
    process.exit(1);
  }
});
