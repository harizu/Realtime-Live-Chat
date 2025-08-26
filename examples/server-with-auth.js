/**
 * Contoh integrasi dengan backend untuk tim backend
 * File ini menunjukkan bagaimana menggunakan utility functions dari chat server
 */

const http = require("http");
const express = require("express");

// Load environment variables from .env file with error handling
try {
  require('dotenv').config();
  console.log('✅ Environment variables loaded');
} catch (error) {
  console.log('⚠️  dotenv not available, using system environment variables');
}

const { createChatServer } = require("..");

const app = express();
const server = http.createServer(app);


app.use(express.json());
app.use('/examples', express.static('examples'));

// Simulasi database users
const users = new Map();
const rooms = new Map();

// Middleware untuk logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Authentication middleware
const authenticateUser = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }
  
  // Simulasi validasi token
  const user = users.get(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  req.user = user;
  next();
};

// API Routes untuk user management
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Simulasi login
  if (email && password) {
    const token = `token-${Date.now()}`;
    const user = {
      id: `user-${Date.now()}`,
      email,
      name: email.split('@')[0],
      token
    };
    
    users.set(token, user);
    res.json({ token, user });
  } else {
    res.status(400).json({ error: 'Email and password required' });
  }
});

app.post('/api/auth/logout', authenticateUser, (req, res) => {
  users.delete(req.user.token);
  res.json({ message: 'Logged out successfully' });
});

// API Routes untuk room management
app.post('/api/rooms', authenticateUser, (req, res) => {
  const { name, isPrivate = false } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Room name required' });
  }
  
  const room = {
    id: `room-${Date.now()}`,
    name,
    isPrivate,
    createdBy: req.user.id,
    createdAt: Date.now(),
    members: [req.user.id]
  };
  
  rooms.set(room.id, room);
  res.json(room);
});

app.get('/api/rooms', authenticateUser, (req, res) => {
  const userRooms = Array.from(rooms.values()).filter(room => 
    !room.isPrivate || room.members.includes(req.user.id)
  );
  res.json(userRooms);
});

app.post('/api/rooms/:roomId/join', authenticateUser, (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  if (!room.members.includes(req.user.id)) {
    room.members.push(req.user.id);
  }
  
  res.json(room);
});

// Global variable untuk chat utils
let chatUtils;

// Inisialisasi chat server
(async () => {
  try {
    const chatServer = await createChatServer(server, {
      enableTyping: true,
      enableReadReceipts: true,
      
      // REST API Configuration - menggunakan built-in REST API
      enableRestApi: process.env.ENABLE_REST_API === 'true' || true, // Default true untuk backend integration
      restApiPrefix: process.env.API_PREFIX || "/api/chat",
      restApiAuth: process.env.API_AUTH === 'true' || false,
      restApiCors: {
        origin: process.env.API_CORS_ORIGIN || "*"
      },
      expressApp: app, // Pass Express app directly
      
      // Authentication middleware untuk Socket.IO
      onAuth: (socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
          return next(new Error('Authentication required'));
        }
        
        const user = users.get(token);
        if (!user) {
          return next(new Error('Invalid token'));
        }
        
        socket.user = user;
        next();
      },
      
      // Custom connect handler
      onConnect: (socket, io) => {
        console.log(`User connected: ${socket.user.name} (${socket.id})`);
        
        // Join user's rooms
        const userRooms = Array.from(rooms.values())
          .filter(room => room.members.includes(socket.user.id))
          .map(room => room.name);
        
        userRooms.forEach(room => {
          socket.join(room);
        });
        
        // Update user status
        socket.emit("user:join", {
          name: socket.user.name,
          email: socket.user.email,
          status: 'online'
        });
      },
      
      // Custom disconnect handler
      onDisconnect: (socket, io) => {
        console.log(`User disconnected: ${socket.user.name} (${socket.id})`);
        
        // Update user status
        socket.broadcast.emit("user:status_changed", {
          userId: socket.id,
          status: 'offline',
          userName: socket.user.name
        });
      }
    });
    
    chatUtils = chatServer.utils;
    
    // Custom API Routes untuk backend integration (di luar built-in REST API)
    app.get('/api/chat/users', authenticateUser, (req, res) => {
      const activeUsers = chatUtils.getActiveUsers();
      res.json(activeUsers);
    });
    
    app.get('/api/chat/rooms', authenticateUser, (req, res) => {
      const roomsInfo = chatUtils.getRooms();
      const roomsList = Array.from(roomsInfo.keys()).map(roomName => ({
        name: roomName,
        userCount: chatUtils.getUsersInRoom(roomName).length
      }));
      res.json(roomsList);
    });
    
    app.post('/api/chat/broadcast', authenticateUser, (req, res) => {
      const { event, data } = req.body;
      
      if (!event || !data) {
        return res.status(400).json({ error: 'Event and data required' });
      }
      
      // Log broadcast
      console.log(`Broadcast from ${req.user.name}: ${event}`, data);
      
      chatUtils.broadcast(event, {
        ...data,
        sentBy: req.user.name,
        timestamp: Date.now()
      });
      
      res.json({ success: true, message: 'Broadcast sent' });
    });
    
    app.post('/api/chat/rooms/:roomName/message', authenticateUser, (req, res) => {
      const { roomName } = req.params;
      const { event, data } = req.body;
      
      if (!event || !data) {
        return res.status(400).json({ error: 'Event and data required' });
      }
      
      // Check if user is in room
      const room = Array.from(rooms.values()).find(r => r.name === roomName);
      if (!room || !room.members.includes(req.user.id)) {
        return res.status(403).json({ error: 'Not a member of this room' });
      }
      
      // Log room message
      console.log(`Room message from ${req.user.name} to ${roomName}: ${event}`, data);
      
      chatUtils.sendToRoom(roomName, event, {
        ...data,
        sentBy: req.user.name,
        timestamp: Date.now()
      });
      
      res.json({ success: true, message: `Message sent to room: ${roomName}` });
    });
    
    app.post('/api/chat/users/:userId/message', authenticateUser, (req, res) => {
      const { userId } = req.params;
      const { event, data } = req.body;
      
      if (!event || !data) {
        return res.status(400).json({ error: 'Event and data required' });
      }
      
      // Check if target user is online
      const targetUser = chatUtils.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found or offline' });
      }
      
      // Log private message
      console.log(`Private message from ${req.user.name} to ${targetUser.name}: ${event}`, data);
      
      chatUtils.sendToUser(userId, event, {
        ...data,
        sentBy: req.user.name,
        timestamp: Date.now()
      });
      
      res.json({ success: true, message: `Message sent to user: ${targetUser.name}` });
    });
    
    // Webhook untuk external events
    app.post('/api/webhooks/notification', (req, res) => {
      const { type, data, target } = req.body;
      
      console.log(`Webhook received: ${type}`, data);
      
      switch (type) {
        case 'broadcast':
          chatUtils.broadcast('notification', { type, data, timestamp: Date.now() });
          break;
          
        case 'room':
          if (target?.room) {
            chatUtils.sendToRoom(target.room, 'notification', { type, data, timestamp: Date.now() });
          }
          break;
          
        case 'user':
          if (target?.userId) {
            chatUtils.sendToUser(target.userId, 'notification', { type, data, timestamp: Date.now() });
          }
          break;
          
        default:
          return res.status(400).json({ error: 'Invalid notification type' });
      }
      
      res.json({ success: true, message: 'Notification sent' });
    });
    
    // Health check dengan chat stats
    app.get('/api/health', (req, res) => {
      const activeUsers = chatUtils.getActiveUsers();
      const rooms = chatUtils.getRooms();
      
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        chat: {
          activeUsers: activeUsers.length,
          totalRooms: rooms.size,
          totalUsers: users.size
        },
        restApi: {
          enabled: chatServer.restApiRoutes?.enabled || false,
          prefix: chatServer.restApiRoutes?.prefix || 'disabled'
        }
      });
    });
    
    const PORT = process.env.PORT || 3000; // Use port from env or default to 3000
    server.listen(PORT, () => {
      console.log(`🚀 Backend integration server running at http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Auth endpoints: /api/auth/login, /api/auth/logout`);
      console.log(`🏠 Room management: /api/rooms`);
      console.log(`💬 Chat operations: /api/chat/*`);
      console.log(`🔗 Webhooks: /api/webhooks/notification`);
      console.log(`💬 Chat client: http://localhost:${PORT}/examples/client-with-auth.html`);
      
      if (chatServer.restApiRoutes) {
        console.log(`🔧 Built-in REST API enabled at ${chatServer.restApiRoutes.prefix}/*`);
      } else {
        console.log(`⚠️  Built-in REST API disabled`);
      }
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = { app, server };
