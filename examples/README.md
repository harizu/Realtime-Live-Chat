# Examples - Realtime Live Chat Package

This folder contains comprehensive examples demonstrating how to use the Realtime Live Chat package with different configurations and features.

## 📁 File Structure

```
examples/
├── README.md                    # This file
├── server.js                    # Basic server with REST API
├── server-with-auth.js          # Advanced server with authentication
├── client.html                  # Basic chat client
├── client-with-auth.html        # Chat client with authentication
├── test-client.js               # Automated test for basic functionality
└── test-client-auth.js          # Automated test with authentication
```

## 🚀 Quick Start

### 1. Basic Server (Recommended for beginners)

```bash
# Start basic server with REST API
npm run example

# Or in development mode with auto-restart
npm run dev
```

**Features:**
- Socket.IO real-time chat
- Built-in REST API
- Room-based messaging
- User management
- Typing indicators
- Read receipts

**Access:**
- Server: http://localhost:3000
- Chat Client: http://localhost:3000/examples/client.html
- Health Check: http://localhost:3000/api/health

### 2. Basic Server (Socket.IO + REST API)

```bash
# Start basic server with REST API
npm run example

# Or in development mode
npm run dev
```

**Features:**
- Socket.IO real-time chat
- Built-in REST API
- Room-based messaging
- User management
- Typing indicators
- Read receipts

**Access:**
- Server: http://localhost:3000
- Chat Client: http://localhost:3000/examples/client.html
- Health Check: http://localhost:3000/api/health

### 3. Advanced Server with Authentication

```bash
# Start server with full backend integration
npm run example:auth

# Or in development mode
npm run dev:auth
```

**Features:**
- Complete authentication system
- User login/logout via REST API
- Room management API
- Private messaging
- Webhook support
- Backend integration examples

**Access:**
- Server: http://localhost:3000
- Chat Client: http://localhost:3000/examples/client-with-auth.html
- API Documentation: http://localhost:3000/api/health

## 🧪 Testing

### Automated Testing

```bash
# Test basic functionality
npm run test

# Test with authentication
npm run test:auth
```

### Manual Testing

1. **Basic Chat:**
   - Start server: `npm run example`
   - Open multiple browser tabs: http://localhost:3000/examples/client.html
   - Join rooms and send messages

2. **Authenticated Chat:**
   - Start server: `npm run example:auth`
   - Open: http://localhost:3000/examples/client-with-auth.html
   - Login with any email/password
   - Test private messaging and room management

## 📋 Example Details

### server.js - Basic Server
**Purpose:** Demonstrates basic chat functionality with REST API

**Key Features:**
- Environment variable configuration
- REST API enabled by default
- Static file serving
- Health check endpoint
- Room-based chat

**Configuration:**
```javascript
const chatServer = createChatServer({
  enableRestApi: true,
  restApiPrefix: '/api',
  restApiAuth: false,
  restApiCors: true,
  expressApp: app
});
```

### server.js - Basic Server
**Purpose:** Demonstrates basic chat functionality with REST API

**Key Features:**
- Environment variable configuration
- REST API enabled by default
- Static file serving
- Health check endpoint
- Room-based chat

**Configuration:**
```javascript
const chatServer = createChatServer({
  enableRestApi: true,
  restApiPrefix: '/api',
  restApiAuth: false,
  restApiCors: true,
  expressApp: app
});
```

### server-with-auth.js - Advanced Server
**Purpose:** Complete backend integration example

**Key Features:**
- User authentication system
- Room management API
- Private messaging
- Webhook support
- Custom REST endpoints
- Database simulation

**API Endpoints:**
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/rooms` - List rooms
- `POST /api/rooms` - Create room
- `POST /api/chat/private` - Send private message
- `POST /api/webhooks/notification` - Webhook endpoint

### client.html - Basic Client
**Purpose:** Simple chat interface

**Features:**
- Room selection
- User list
- Message display
- Typing indicators
- Read receipts
- Real-time updates

### client-with-auth.html - Authenticated Client
**Purpose:** Chat interface with authentication

**Features:**
- Login/logout functionality
- Token-based authentication
- Private messaging
- Room management
- User status
- Enhanced UI

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
REDIS_URL=redis://localhost:6379

# REST API Configuration
ENABLE_REST_API=true
API_PREFIX=/api
API_AUTH=false
API_CORS_ORIGIN=*

# Authentication (for server-with-auth.js)
JWT_SECRET=your-secret-key
```

### Port Configuration

| Example | Default Port | Purpose |
|---------|-------------|---------|
| `server.js` | 3000 | Basic with REST API |
| `server-with-auth.js` | 3000 | Advanced with auth |

## 🐛 Troubleshooting

### Common Issues

1. **Port Already in Use:**
   ```bash
   # Check what's using the port
   lsof -i :3000
   
   # Kill the process
   kill <PID>
   ```

2. **Redis Connection Error:**
   ```bash
   # Install and start Redis
   brew install redis  # macOS
   redis-server
   ```

3. **Environment Variables Not Loading:**
   ```bash
   # Ensure .env file exists
   cp env.example .env
   
   # Check if dotenv is installed
   npm install dotenv
   ```

4. **Client Can't Connect:**
   - Verify server is running
   - Check port configuration
   - Ensure CORS is properly configured
   - Check browser console for errors

### Debug Mode

Enable debug logging by setting environment variables:

```bash
DEBUG=socket.io:* npm run example
```

## 📚 Integration Examples

### Backend Integration

The `server-with-auth.js` demonstrates how to integrate the chat package with your existing backend:

1. **User Authentication:**
   ```javascript
   // Custom login endpoint
   app.post('/api/auth/login', (req, res) => {
     // Your authentication logic here
   });
   ```

2. **Room Management:**
   ```javascript
   // Custom room creation
   app.post('/api/rooms', (req, res) => {
     // Your room creation logic here
   });
   ```

3. **Webhook Integration:**
   ```javascript
   // External system notifications
   app.post('/api/webhooks/notification', (req, res) => {
     // Handle external events
   });
   ```

### Frontend Integration

Use the provided client examples as templates for your frontend integration:

1. **Basic Integration:**
   ```javascript
   const socket = io('http://localhost:3000');
   ```

2. **With Authentication:**
   ```javascript
   const socket = io('http://localhost:3000', {
     auth: { token: 'your-token' }
   });
   ```

## 🚀 Next Steps

1. **Customize Examples:** Modify the examples to match your requirements
2. **Add Database:** Replace simulated data with real database connections
3. **Enhance Security:** Implement proper authentication and authorization
4. **Scale Up:** Deploy multiple server instances with Redis
5. **Monitor:** Add logging and monitoring for production use

## 📞 Support

For issues and questions:
- Check the main README.md for package documentation
- Review the troubleshooting section above
- Test with the provided examples first
- Ensure all dependencies are properly installed
