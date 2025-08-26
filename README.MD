# Realtime Live Chat

A lightweight Node.js package for building **real-time chat systems** powered by [Socket.IO](https://socket.io/) and [Redis](https://redis.io/).  
Enables scalable communication across multiple server instances using Redis as a pub/sub adapter.

## ✨ Key Features

- 🔌 Easy integration with Express or other Node.js HTTP servers
- 💬 Real-time bidirectional communication via Socket.IO
- 🚀 Redis adapter for horizontal scaling
- 👥 Room-based messaging support
- 🔐 Optional authentication middleware
- ⌨️ Typing indicators
- ✅ Read receipts
- 💬 Private messaging
- 👤 User management
- 🏠 Room management
- 🔧 Utility functions for backend teams

## 🎯 Use Cases

- Customer support chat
- Group chat or private messaging
- Real-time collaboration applications
- Notifications and event broadcasting
- Live streaming chat
- Gaming chat systems

## 📦 Installation

```bash
npm install realtime-live-chat
```

## 🚀 Quick Start

### Basic Setup

```javascript
const http = require("http");
const express = require("express");
const { createChatServer } = require("realtime-live-chat");

const app = express();
const server = http.createServer(app);

app.get("/", (_, res) => res.send("Chat Server Running"));

(async () => {
  const chatServer = await createChatServer(server, {
    // Configuration options
  });

  server.listen(3000, () => {
    console.log("Server running on port 3000");
  });
})();
```

### Advanced Setup with Authentication

```javascript
const { createChatServer } = require("realtime-live-chat");

const chatServer = await createChatServer(server, {
  redisUrl: "redis://localhost:6379",
  enableTyping: true,
  enableReadReceipts: true,
  
  // Authentication middleware
  onAuth: (socket, next) => {
    const token = socket.handshake.auth.token;
    if (validateToken(token)) {
      socket.user = getUserFromToken(token);
      next();
    } else {
      next(new Error('Authentication failed'));
    }
  },
  
  // Custom event handlers
  onConnect: (socket, io) => {
    console.log(`User connected: ${socket.user.name}`);
  },
  
  onDisconnect: (socket, io) => {
    console.log(`User disconnected: ${socket.user.name}`);
  }
});

// Access utility functions
const { utils } = chatServer;
```

## 📚 API Reference

### createChatServer(httpServer, options)

Creates a chat server instance.

#### Parameters

- `httpServer` (HttpServer): HTTP server from Node.js/Express
- `options` (Object): Optional configuration

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `redisUrl` | string | `process.env.REDIS_URL \|\| "redis://127.0.0.1:6379"` | Redis connection URL |
| `cors` | object | `{ origin: "*" }` | CORS options for Socket.IO |
| `namespace` | string | `"/"` | Socket.IO namespace |
| `onAuth` | function | - | Authentication middleware |
| `onConnect` | function | - | Callback when user connects |
| `onDisconnect` | function | - | Callback when user disconnects |
| `enableTyping` | boolean | `true` | Enable typing indicators |
| `enableReadReceipts` | boolean | `true` | Enable read receipts |
| `typingTimeout` | number | `3000` | Timeout for typing indicator (ms) |
| `enableRestApi` | boolean | `false` | Enable REST API endpoints |
| `restApiPrefix` | string | `"/api"` | Prefix for REST API routes |
| `restApiAuth` | boolean | `false` | Enable auth for REST API |
| `restApiCors` | object | `{ origin: "*" }` | CORS options for REST API |

#### Returns

```javascript
{
  io: SocketIOServer,
  pubClient: RedisClient,
  subClient: RedisClient,
  utils: ChatServerUtils,
  restApiRoutes: RestApiRoutes | null
}
```

### Utility Functions

This package provides utility functions for backend teams:

#### `utils.getActiveUsers()`
Get list of all active users.

#### `utils.getUser(socketId)`
Get user information by socket ID.

#### `utils.sendToRoom(room, event, data)`
Send event to specific room.

#### `utils.sendToUser(userId, event, data)`
Send event to specific user.

#### `utils.broadcast(event, data)`
Broadcast event to all users.

#### `utils.getRooms()`
Get information about all rooms.

#### `utils.getUsersInRoom(room)`
Get list of users in specific room.

## 🔌 Socket Events

### Client to Server

| Event | Data | Description |
|-------|------|-------------|
| `user:join` | `{ name, email, status }` | Join as user |
| `join` | `room` | Join room |
| `leave` | `room` | Leave room |
| `message` | `{ room, text, meta, replyTo }` | Send message |
| `message:private` | `{ toUserId, text, meta }` | Send private message |
| `typing:start` | `{ room }` | Start typing indicator |
| `typing:stop` | `{ room }` | Stop typing indicator |
| `message:read` | `{ messageId, room }` | Mark message as read |
| `user:status` | `status` | Update user status |
| `room:create` | `{ roomName, isPrivate }` | Create new room |

### Server to Client

| Event | Data | Description |
|-------|------|-------------|
| `users:list` | `User[]` | List of active users |
| `user:joined` | `User` | New user joined |
| `user:left` | `{ userId, userName, reason }` | User left |
| `room:joined` | `room` | Successfully joined room |
| `room:left` | `room` | Successfully left room |
| `message` | `Message` | New message |
| `message:private` | `PrivateMessage` | Private message |
| `typing:start` | `TypingData` | User started typing |
| `typing:stop` | `TypingData` | User stopped typing |
| `message:read` | `ReadReceipt` | Message read receipt |
| `user:status_changed` | `{ userId, status, userName }` | User status changed |

## 🛠️ Examples

### Basic Example (with REST API)

Run example with REST API enabled:

```bash
npm run example
```

Access client via browser:
- **URL**: `http://localhost:3000/examples/client.html`
- **Or**: Open `examples/client.html` directly in browser

### Basic Example (Socket.IO + REST API)

Run example with REST API enabled:

```bash
npm run example
```

Access client via browser:
- **URL**: `http://localhost:3000/examples/client.html`
- **Or**: Open `examples/client.html` directly in browser

### Advanced Example with Authentication

Run example with authentication and REST API:

```bash
npm run example:auth
```

Access client via browser:
- **URL**: `http://localhost:3000/examples/client-with-auth.html`
- **Or**: Open `examples/client-with-auth.html` directly in browser

**Features:**
- ✅ Authentication system
- ✅ User management
- ✅ Room management  
- ✅ Built-in REST API
- ✅ Custom API endpoints
- ✅ Webhook integration

### Development Mode

For development with auto-reload:

```bash
npm run dev          # Basic example with REST API
npm run dev:auth     # Auth example
```

### Testing

For testing chat functionality with automated test client:

#### Basic Testing (without auth):
```bash
# 1. Start server first
npm run example

# 2. In another terminal, run test
npm run test
```

#### Testing with Authentication:
```bash
# 1. Start auth server first
npm run example:auth

# 2. In another terminal, run test with auth
npm run test:auth
```

**Test client will:**
- ✅ Create 3 virtual clients
- ✅ **Auto login** (for auth test)
- ✅ Connect to server with token
- ✅ Join room and send messages
- ✅ Test typing indicators
- ✅ Test user join/leave events
- ✅ Display test statistics

## 🔧 REST API Configuration

### Enable/Disable REST API

```javascript
// Enable REST API
const chatServer = await createChatServer(server, {
  enableRestApi: true,
  restApiPrefix: "/api",
  restApiAuth: false
});

// Disable REST API (default)
const chatServer = await createChatServer(server, {
  enableRestApi: false
});
```

### Environment Variables

Copy `env.example` to `.env` and adjust configuration:

```bash
# Copy example file
cp env.example .env

# Install dependencies (including dotenv)
npm install

# Edit .env file if needed
nano .env
```

Example configuration:

```bash
# Redis Configuration
REDIS_URL=redis://127.0.0.1:6379

# Server Configuration
PORT=3000

# REST API Configuration
ENABLE_REST_API=true
API_PREFIX=/api
API_AUTH=false
API_CORS_ORIGIN=*

# Authentication (for demo)
JWT_SECRET=your-secret-key-here
```

### REST API Endpoints

This package provides example REST API for integration:

```javascript
// Get active users
GET /api/users

// Get rooms
GET /api/rooms

// Send broadcast message
POST /api/broadcast
{
  "event": "notification",
  "data": { "message": "Hello everyone!" }
}

// Send message to room
POST /api/room/:roomName/message
{
  "event": "notification",
  "data": { "message": "Room message" }
}

// Send message to user
POST /api/users/:userId/message
{
  "event": "notification",
  "data": { "message": "Private message" }
}
```

### Webhook Integration

```javascript
// Send notification via webhook
POST /api/webhooks/notification
{
  "type": "broadcast",
  "data": { "message": "System notification" }
}

// Send to specific room
{
  "type": "room",
  "target": { "room": "general" },
  "data": { "message": "Room notification" }
}

// Send to specific user
{
  "type": "user",
  "target": { "userId": "socket-id" },
  "data": { "message": "User notification" }
}
```

## 🔧 Backend Integration

### REST API Endpoints

This package provides **built-in REST API** that can be enabled/disabled:

#### Built-in REST API (automatic if enableRestApi: true)
```javascript
GET /api/users          # Get active users
GET /api/rooms          # Get rooms
POST /api/broadcast     # Send broadcast message
POST /api/room/:roomName/message  # Send to room
POST /api/users/:userId/message   # Send to user
POST /api/webhooks/notification   # Webhook endpoint
GET /api/health         # Health check
```

#### Custom API Routes (backend-integration.js)
Package also provides example custom API routes for backend integration:

```javascript
// Get active users
GET /api/users

// Get rooms
GET /api/rooms

// Send broadcast message
POST /api/broadcast
{
  "event": "notification",
  "data": { "message": "Hello everyone!" }
}

// Send message to room
POST /api/room/:roomName/message
{
  "event": "notification",
  "data": { "message": "Room message" }
}

// Send message to user
POST /api/users/:userId/message
{
  "event": "notification",
  "data": { "message": "Private message" }
}
```

### Webhook Integration

```javascript
// Send notification via webhook
POST /api/webhooks/notification
{
  "type": "broadcast",
  "data": { "message": "System notification" }
}

// Send to specific room
{
  "type": "room",
  "target": { "room": "general" },
  "data": { "message": "Room notification" }
}

// Send to specific user
{
  "type": "user",
  "target": { "userId": "socket-id" },
  "data": { "message": "User notification" }
}
```

## 🔐 Authentication

### Basic Authentication

```javascript
const chatServer = await createChatServer(server, {
  onAuth: (socket, next) => {
    const token = socket.handshake.auth.token;
    if (token === 'valid-token') {
      next();
    } else {
      next(new Error('Authentication failed'));
    }
  }
});
```

### JWT Authentication

```javascript
const jwt = require('jsonwebtoken');

const chatServer = await createChatServer(server, {
  onAuth: (socket, next) => {
    const token = socket.handshake.auth.token;
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  }
});
```

## 🚀 Scaling

### Horizontal Scaling with Redis

This package automatically uses Redis adapter for scaling:

```javascript
// Server 1
const chatServer1 = await createChatServer(server1, {
  redisUrl: "redis://redis-server:6379"
});

// Server 2
const chatServer2 = await createChatServer(server2, {
  redisUrl: "redis://redis-server:6379"
});

// Messages will automatically sync across servers
```

### Load Balancer Configuration

```nginx
upstream chat_servers {
    server chat1.example.com:3000;
    server chat2.example.com:3000;
    server chat3.example.com:3000;
}

server {
    listen 80;
    server_name chat.example.com;
    
    location / {
        proxy_pass http://chat_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📊 Monitoring

### Health Check

```javascript
app.get('/api/health', (req, res) => {
  const activeUsers = chatUtils.getActiveUsers();
  const rooms = chatUtils.getRooms();
  
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    chat: {
      activeUsers: activeUsers.length,
      totalRooms: rooms.size
    }
  });
});
```

### Logging

```javascript
const chatServer = await createChatServer(server, {
  onConnect: (socket, io) => {
    console.log(`[${new Date().toISOString()}] User connected: ${socket.user?.name || socket.id}`);
  },
  
  onDisconnect: (socket, io) => {
    console.log(`[${new Date().toISOString()}] User disconnected: ${socket.user?.name || socket.id}`);
  }
});
```

## 🐛 Troubleshooting

### Common Issues

1. **Redis Connection Error**
   ```bash
   # Make sure Redis server is running
   redis-server
   
   # Or use Redis Cloud
   redisUrl: "redis://username:password@host:port"
   ```

2. **CORS Issues**
   ```javascript
   const chatServer = await createChatServer(server, {
     cors: {
       origin: ["http://localhost:3000", "https://yourdomain.com"],
       credentials: true
     }
   });
   ```

3. **Authentication Issues**
   ```javascript
   // Make sure token is sent correctly
   const socket = io("http://localhost:3000", {
     auth: { token: "your-token" }
   });
   ```

4. **REST API Issues**
   ```bash
   # Make sure REST API is enabled
   ENABLE_REST_API=true
   
   # Check API endpoints
   curl http://localhost:3000/api/health
   curl http://localhost:3000/api/users
   ```

5. **CORS Issues with REST API**
   ```javascript
   const chatServer = await createChatServer(server, {
     restApiCors: {
       origin: ["http://localhost:3000", "https://yourdomain.com"],
       credentials: true
     }
   });
   ```

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

Copyright (c) 2024 Abdul Haris Dwi Utomo

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Create Pull Request

## 📞 Support

- 📧 Email: harizu.sekai@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/harizu/Realtime-Live-Chat/issues)
- 📖 Documentation: [GitHub Wiki](https://github.com/harizu/Realtime-Live-Chat/wiki)

## 🎯 Quick Summary

### For Real-time Chat + REST API:
```bash
npm run example
# Access: http://localhost:3000/examples/client.html
# API: http://localhost:3000/api/*
```



### For Full Backend Integration:
```bash
npm run example:auth
# Access: http://localhost:3000/examples/client-with-auth.html
# API: http://localhost:3000/api/*
# Auth: http://localhost:3000/api/auth/*
```

### For Development:
```bash
npm run dev         # Socket.IO + REST API
npm run dev:auth    # Full features with auth
```

## 📖 Examples Documentation

For detailed examples and usage guides, see the [examples/README.md](examples/README.md) file.