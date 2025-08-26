// index.js
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");

/**
 * Membuat server chat berbasis Socket.IO + Redis Adapter
 * @param {import('http').Server} httpServer - HTTP Server dari Node/Express
 * @param {Object} opts - opsi
 * @param {string} [opts.redisUrl] - URL Redis (default ambil dari env REDIS_URL)
 * @param {Object} [opts.cors] - opsi CORS untuk Socket.IO
 * @param {string} [opts.namespace] - namespace socket.io (default "/")
 * @param {(socket, next) => void} [opts.onAuth] - middleware auth (opsional)
 * @param {(socket, io) => void} [opts.onConnect] - callback connect (opsional)
 * @param {(socket, io) => void} [opts.onDisconnect] - callback disconnect (opsional)
 * @param {boolean} [opts.enableTyping] - enable typing indicators (default: true)
 * @param {boolean} [opts.enableReadReceipts] - enable read receipts (default: true)
 * @param {number} [opts.typingTimeout] - timeout untuk typing indicator dalam ms (default: 3000)
 * @param {boolean} [opts.enableRestApi] - enable REST API endpoints (default: false)
 * @param {string} [opts.restApiPrefix] - prefix untuk REST API routes (default: "/api")
 * @param {boolean} [opts.restApiAuth] - enable auth untuk REST API (default: false)
 * @param {Object} [opts.restApiCors] - CORS options untuk REST API
 * @param {Object} [opts.expressApp] - Express app instance (opsional, untuk REST API)
 * @returns {{ io: import('socket.io').Server, pubClient: any, subClient: any, utils: any }}
 */
async function createChatServer(httpServer, opts = {}) {
  const {
    redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379",
    cors = { origin: "*" },
    namespace = "/",
    onAuth,
    onConnect,
    onDisconnect,
    enableTyping = true,
    enableReadReceipts = true,
    typingTimeout = 3000,
    enableRestApi = false,
    restApiPrefix = "/api",
    restApiAuth = false,
    restApiCors = { origin: "*" },
    expressApp = null,
  } = opts;

  const io = new Server(httpServer, { cors });

  // Redis Pub/Sub
  const pubClient = createClient({ url: redisUrl });
  const subClient = pubClient.duplicate();
  await pubClient.connect();
  await subClient.connect();

  io.adapter(createAdapter(pubClient, subClient));

  const nsp = io.of(namespace);

  // Store active users
  const activeUsers = new Map();
  const typingUsers = new Map();

  // (opsional) auth middleware
  if (onAuth) nsp.use(onAuth);

  // event dasar
  nsp.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // User management
    socket.on("user:join", (userData) => {
      const user = {
        id: socket.id,
        ...userData,
        connectedAt: Date.now(),
        lastSeen: Date.now()
      };
      
      activeUsers.set(socket.id, user);
      socket.user = user;
      
      // Broadcast user joined
      socket.broadcast.emit("user:joined", user);
      
      // Send current active users to new user
      socket.emit("users:list", Array.from(activeUsers.values()));
      
      console.log(`User joined: ${userData.name || socket.id}`);
    });

    // join/leave room
    socket.on("join", (room) => {
      socket.join(room);
      socket.emit("room:joined", room);
      socket.to(room).emit("user:joined_room", { 
        userId: socket.id, 
        userName: socket.user?.name || socket.id,
        room 
      });
    });

    socket.on("leave", (room) => {
      socket.leave(room);
      socket.emit("room:left", room);
      socket.to(room).emit("user:left_room", { 
        userId: socket.id, 
        userName: socket.user?.name || socket.id,
        room 
      });
    });

    // pesan ke room tertentu atau global
    socket.on("message", ({ room, text, meta, replyTo }) => {
      const message = {
        id: `${socket.id}-${Date.now()}`,
        user: socket.user || { id: socket.id, name: socket.id },
        text,
        meta,
        replyTo,
        room,
        ts: Date.now(),
        readBy: [socket.id]
      };

      if (room) {
        nsp.to(room).emit("message", message);
      } else {
        socket.broadcast.emit("message", message);
      }

      // Update last seen
      if (socket.user) {
        socket.user.lastSeen = Date.now();
        activeUsers.set(socket.id, socket.user);
      }
    });

    // Typing indicators
    if (enableTyping) {
      socket.on("typing:start", ({ room }) => {
        const typingData = {
          userId: socket.id,
          userName: socket.user?.name || socket.id,
          room,
          ts: Date.now()
        };
        
        if (room) {
          socket.to(room).emit("typing:start", typingData);
        } else {
          socket.broadcast.emit("typing:start", typingData);
        }
      });

      socket.on("typing:stop", ({ room }) => {
        const typingData = {
          userId: socket.id,
          userName: socket.user?.name || socket.id,
          room
        };
        
        if (room) {
          socket.to(room).emit("typing:stop", typingData);
        } else {
          socket.broadcast.emit("typing:stop", typingData);
        }
      });
    }

    // Read receipts
    if (enableReadReceipts) {
      socket.on("message:read", ({ messageId, room }) => {
        const readData = {
          messageId,
          userId: socket.id,
          userName: socket.user?.name || socket.id,
          room,
          ts: Date.now()
        };
        
        if (room) {
          nsp.to(room).emit("message:read", readData);
        } else {
          socket.broadcast.emit("message:read", readData);
        }
      });
    }

    // User status
    socket.on("user:status", (status) => {
      if (socket.user) {
        socket.user.status = status;
        socket.user.lastSeen = Date.now();
        activeUsers.set(socket.id, socket.user);
        socket.broadcast.emit("user:status_changed", {
          userId: socket.id,
          status,
          userName: socket.user.name
        });
      }
    });

    // Private messages
    socket.on("message:private", ({ toUserId, text, meta }) => {
      const message = {
        id: `${socket.id}-${Date.now()}`,
        from: socket.user || { id: socket.id, name: socket.id },
        to: toUserId,
        text,
        meta,
        ts: Date.now(),
        type: 'private'
      };

      // Send to recipient
      socket.to(toUserId).emit("message:private", message);
      // Send back to sender for confirmation
      socket.emit("message:private", message);
    });

    // Room management
    socket.on("room:create", ({ roomName, isPrivate = false }) => {
      const roomData = {
        name: roomName,
        id: roomName,
        createdBy: socket.id,
        isPrivate,
        createdAt: Date.now(),
        members: [socket.id]
      };
      
      socket.join(roomName);
      socket.emit("room:created", roomData);
      socket.broadcast.emit("room:created", roomData);
    });

    // Custom event handler
    onConnect?.(socket, nsp);

    // Disconnect handling
    socket.on("disconnect", (reason) => {
      console.log(`User disconnected: ${socket.id}, reason: ${reason}`);
      
      // Remove from active users
      const user = activeUsers.get(socket.id);
      if (user) {
        activeUsers.delete(socket.id);
        socket.broadcast.emit("user:left", {
          userId: socket.id,
          userName: user.name,
          reason
        });
      }

      // Clear typing indicators
      typingUsers.delete(socket.id);

      onDisconnect?.(socket, nsp);
    });
  });

  // Utility functions untuk tim backend
  const utils = {
    // Get all active users
    getActiveUsers: () => Array.from(activeUsers.values()),
    
    // Get user by socket id
    getUser: (socketId) => activeUsers.get(socketId),
    
    // Send message to specific room
    sendToRoom: (room, event, data) => nsp.to(room).emit(event, data),
    
    // Send message to specific user
    sendToUser: (userId, event, data) => nsp.to(userId).emit(event, data),
    
    // Broadcast to all users
    broadcast: (event, data) => nsp.emit(event, data),
    
    // Get rooms info
    getRooms: () => {
      if (!nsp.sockets || !nsp.sockets.adapter) {
        console.warn('Socket.IO adapter not ready, returning empty Map');
        return new Map();
      }
      return nsp.sockets.adapter.rooms || new Map();
    },
    
    // Get users in room
    getUsersInRoom: (room) => {
      if (!nsp.sockets || !nsp.sockets.adapter) {
        return [];
      }
      const rooms = nsp.sockets.adapter.rooms || new Map();
      const roomSockets = rooms.get(room);
      return roomSockets ? Array.from(roomSockets) : [];
    }
  };

  // Setup REST API jika di-enable
  let restApiRoutes = null;
  if (enableRestApi) {
    restApiRoutes = setupRestApiRoutes(expressApp || httpServer, utils, {
      prefix: restApiPrefix,
      auth: restApiAuth,
      cors: restApiCors
    });
  }

  return { io, pubClient, subClient, utils, restApiRoutes };
}

/**
 * Setup REST API routes
 * @param {import('http').Server|Object} serverOrApp - HTTP server atau Express app
 * @param {Object} utils - Chat utilities
 * @param {Object} options - REST API options
 */
function setupRestApiRoutes(serverOrApp, utils, options = {}) {
  const { prefix = "/api", auth = false, cors = { origin: "*" } } = options;
  
  // Determine if we have Express app or HTTP server
  let app = null;
  
  // If it's already an Express app
  if (serverOrApp && typeof serverOrApp.get === 'function') {
    app = serverOrApp;
  } else {
    // Try to get Express app from HTTP server
    const server = serverOrApp;
    
    // Method 1: Try to get from server listeners
    if (server.listeners && server.listeners('request').length > 0) {
      const requestListener = server.listeners('request')[0];
      if (requestListener && requestListener.app) {
        app = requestListener.app;
      }
    }
    
    // Method 2: Try to get from server._events
    if (!app && server._events && server._events.request) {
      const requestHandler = server._events.request;
      if (requestHandler && requestHandler.app) {
        app = requestHandler.app;
      }
    }
    
    // Method 3: Try to get from server._handle
    if (!app && server._handle && server._handle.app) {
      app = server._handle.app;
    }
  }
  
  if (!app) {
    console.warn("Express app not found, REST API routes not set up");
    console.warn("This might happen if Express app is not properly attached to the server");
    return null;
  }

  console.log("✅ Express app found, setting up REST API routes");

  // CORS middleware untuk REST API
  if (cors.origin !== "*") {
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', cors.origin);
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  // Authentication middleware untuk REST API
  const authenticateApi = (req, res, next) => {
    if (!auth) return next();
    
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }
    
    // Implement your token validation here
    // For demo purposes, we'll accept any token
    req.user = { id: 'api-user', name: 'API User' };
    next();
  };

  // API Routes
  app.get(`${prefix}/users`, authenticateApi, (req, res) => {
    res.json({ users: utils.getActiveUsers() });
  });

  app.get(`${prefix}/rooms`, authenticateApi, (req, res) => {
    const rooms = utils.getRooms();
    res.json({ rooms: rooms ? Array.from(rooms.keys()) : [] });
  });

  app.post(`${prefix}/broadcast`, authenticateApi, (req, res) => {
    const { event, data } = req.body;
    if (!event || !data) {
      return res.status(400).json({ error: 'Event and data required' });
    }
    
    utils.broadcast(event, data);
    res.json({ success: true, message: 'Broadcast sent' });
  });

  app.post(`${prefix}/room/:roomName/message`, authenticateApi, (req, res) => {
    const { roomName } = req.params;
    const { event, data } = req.body;
    
    if (!event || !data) {
      return res.status(400).json({ error: 'Event and data required' });
    }
    
    utils.sendToRoom(roomName, event, data);
    res.json({ success: true, message: `Message sent to room: ${roomName}` });
  });

  app.post(`${prefix}/users/:userId/message`, authenticateApi, (req, res) => {
    const { userId } = req.params;
    const { event, data } = req.body;
    
    if (!event || !data) {
      return res.status(400).json({ error: 'Event and data required' });
    }
    
    const targetUser = utils.getUser(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found or offline' });
    }
    
    utils.sendToUser(userId, event, data);
    res.json({ success: true, message: `Message sent to user: ${targetUser.name}` });
  });

  // Webhook endpoint
  app.post(`${prefix}/webhooks/notification`, authenticateApi, (req, res) => {
    const { type, data, target } = req.body;
    
    switch (type) {
      case 'broadcast':
        utils.broadcast('notification', { type, data, timestamp: Date.now() });
        break;
      case 'room':
        if (target?.room) {
          utils.sendToRoom(target.room, 'notification', { type, data, timestamp: Date.now() });
        }
        break;
      case 'user':
        if (target?.userId) {
          utils.sendToUser(target.userId, 'notification', { type, data, timestamp: Date.now() });
        }
        break;
      default:
        return res.status(400).json({ error: 'Invalid notification type' });
    }
    
    res.json({ success: true, message: 'Notification sent' });
  });

  // Health check
  app.get(`${prefix}/health`, (req, res) => {
    const activeUsers = utils.getActiveUsers();
    const rooms = utils.getRooms();
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      chat: {
        activeUsers: activeUsers.length,
        totalRooms: rooms ? rooms.size : 0
      },
      restApi: {
        enabled: true,
        prefix: prefix
      }
    });
  });

  console.log(`REST API routes enabled at ${prefix}/*`);
  return { prefix, enabled: true };
}

module.exports = { createChatServer };
