/**
 * Test client untuk testing chat functionality dengan authentication
 * Jalankan dengan: node examples/test-client-auth.js
 */

const io = require('socket.io-client');

// Konfigurasi
const SERVER_URL = 'http://localhost:3000';
const NUM_CLIENTS = 3;
const TEST_DURATION = 30000; // 30 detik

class TestClientAuth {
  constructor(id) {
    this.id = id;
    this.socket = null;
    this.messageCount = 0;
    this.connected = false;
    this.token = null;
    this.user = null;
  }

  async login() {
    try {
      const response = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: `test${this.id}@example.com`,
          password: 'password123'
        })
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
      }

      const data = await response.json();
      this.token = data.token;
      this.user = data.user;
      
      console.log(`[Client ${this.id}] Login successful: ${this.user.name}`);
      return true;
    } catch (error) {
      console.error(`[Client ${this.id}] Login failed:`, error.message);
      return false;
    }
  }

  connect() {
    return new Promise(async (resolve, reject) => {
      // Login terlebih dahulu
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        reject(new Error('Login failed'));
        return;
      }

      this.socket = io(SERVER_URL, {
        auth: {
          token: this.token
        }
      });

      this.socket.on('connect', () => {
        console.log(`[Client ${this.id}] Connected: ${this.socket.id} (${this.user.name})`);
        this.connected = true;
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
    }
  }

  getStats() {
    return {
      id: this.id,
      name: this.user?.name || `Client-${this.id}`,
      connected: this.connected,
      messageCount: this.messageCount,
      socketId: this.socket?.id || 'disconnected'
    };
  }
}

class ChatTesterAuth {
  constructor() {
    this.clients = [];
    this.testInterval = null;
    this.messageInterval = null;
    this.typingInterval = null;
  }

  async start() {
    console.log('🚀 Starting authenticated chat test with', NUM_CLIENTS, 'clients...');
    console.log('Server URL:', SERVER_URL);
    console.log('');

    // Create clients
    for (let i = 1; i <= NUM_CLIENTS; i++) {
      this.clients.push(new TestClientAuth(i));
    }

    // Connect all clients
    console.log('📡 Connecting clients...');
    for (const client of this.clients) {
      try {
        await client.connect();
        await new Promise(resolve => setTimeout(resolve, 500)); // Delay between connections
      } catch (error) {
        console.error(`Failed to connect client ${client.id}:`, error.message);
      }
    }

    console.log('');
    console.log('✅ All clients connected! Starting test...');
    console.log('');

    // Start test intervals
    this.startTestIntervals();

    // Stop test after duration
    setTimeout(() => {
      this.stop();
    }, TEST_DURATION);
  }

  startTestIntervals() {
    // Send random messages every 2-5 seconds
    this.messageInterval = setInterval(() => {
      const client = this.getRandomClient();
      if (client) {
        const messages = [
          'Hello everyone!',
          'How are you doing?',
          'This is a test message',
          'Chat is working great!',
          'Testing typing indicators...',
          'Message from authenticated user',
          'Socket.IO is awesome!',
          'Real-time communication rocks!'
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        client.sendMessage(`${randomMessage} (${client.user.name})`);
      }
    }, 2000 + Math.random() * 3000);

    // Simulate typing indicators
    this.typingInterval = setInterval(() => {
      const client = this.getRandomClient();
      if (client) {
        client.startTyping();
        setTimeout(() => {
          client.stopTyping();
        }, 1000 + Math.random() * 2000);
      }
    }, 5000 + Math.random() * 5000);
  }

  getRandomClient() {
    const connectedClients = this.clients.filter(c => c.connected);
    if (connectedClients.length === 0) return null;
    return connectedClients[Math.floor(Math.random() * connectedClients.length)];
  }

  stop() {
    console.log('');
    console.log('🛑 Stopping authenticated chat test...');
    
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
    
    console.log('✅ Authenticated test completed!');
    process.exit(0);
  }

  printStats() {
    console.log('');
    console.log('📊 Authenticated Test Results:');
    console.log('==============================');
    
    this.clients.forEach(client => {
      const stats = client.getStats();
      console.log(`${stats.name}: ${stats.connected ? '✅ Connected' : '❌ Disconnected'} | Messages: ${stats.messageCount} | Socket: ${stats.socketId}`);
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
  console.log('\n🛑 Received SIGINT, stopping authenticated test...');
  if (global.tester) {
    global.tester.stop();
  }
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, stopping authenticated test...');
  if (global.tester) {
    global.tester.stop();
  }
});

// Start test
async function main() {
  try {
    const tester = new ChatTesterAuth();
    global.tester = tester;
    await tester.start();
  } catch (error) {
    console.error('❌ Authenticated test failed:', error);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${SERVER_URL}/api/health`);
    if (response.ok) {
      console.log('✅ Auth server is running');
      return true;
    }
  } catch (error) {
    console.error('❌ Auth server is not running. Please start the server first:');
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
