const http = require("http");
const express = require("express");
require('dotenv').config();


const { createChatServer } = require(".."); 

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/examples', express.static('examples'));

// route healthcheck
app.get("/", (_, res) => res.json({ 
  status: "OK", 
  timestamp: new Date().toISOString(),
  uptime: process.uptime()
}));

// Global variable untuk chat utils
let chatUtils;

// Inisialisasi chat server
(async () => {
  try {
    
    const chatServer = await createChatServer(server, {
      redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
      enableTyping: true,
      enableReadReceipts: true,
      typingTimeout: 3000,
      
      // REST API Configuration
      enableRestApi: process.env.ENABLE_REST_API === 'true' || false,
      restApiPrefix: process.env.API_PREFIX || "/api",
      restApiAuth: process.env.API_AUTH === 'true' || false,
      restApiCors: {
        origin: process.env.API_CORS_ORIGIN || "*"
      },
      expressApp: app, // Pass Express app directly
      
      // Authentication middleware (contoh sederhana)
      onAuth: (socket, next) => {
        // Contoh: validasi token dari query parameter
        const token = socket.handshake.query.token;
        if (token === 'demo-token') {
          next();
        } else {
          // Untuk demo, kita allow semua koneksi
          console.log('Demo mode: allowing connection without auth');
          next();
        }
      },

      // Custom connect handler
      onConnect: (socket, io) => {
        console.log(`New connection: ${socket.id}`);
        
        // Set default user data jika tidak ada
        if (!socket.user) {
          socket.emit("user:join", {
            name: `User-${socket.id.slice(0, 6)}`,
            email: `user-${socket.id.slice(0, 6)}@example.com`
          });
        }
      },

      // Custom disconnect handler
      onDisconnect: (socket, io) => {
        console.log(`User disconnected: ${socket.id}`);
        // Bisa tambahkan logic untuk cleanup atau logging
      }
    });

    // Store utils untuk digunakan di API routes
    chatUtils = chatServer.utils;

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`🚀 Chat server running at http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/`);
      console.log(`💬 Chat client: http://localhost:${PORT}/examples/client.html`);
      
      if (chatServer.restApiRoutes) {
        console.log(`🔧 REST API enabled at http://localhost:${PORT}${chatServer.restApiRoutes.prefix}/*`);
        console.log(`👥 Users API: http://localhost:${PORT}${chatServer.restApiRoutes.prefix}/users`);
        console.log(`🏠 Rooms API: http://localhost:${PORT}${chatServer.restApiRoutes.prefix}/rooms`);
        console.log(`📡 Broadcast API: http://localhost:${PORT}${chatServer.restApiRoutes.prefix}/broadcast`);
        console.log(`🔗 Webhook API: http://localhost:${PORT}${chatServer.restApiRoutes.prefix}/webhooks/notification`);
      } else {
        console.log(`⚠️  REST API disabled. Set ENABLE_REST_API=true to enable`);
        console.log(`💡 Try: ENABLE_REST_API=true npm run example`);
      }
    });

  } catch (error) {
    console.error('Failed to start chat server:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
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
