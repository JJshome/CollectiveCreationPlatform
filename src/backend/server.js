const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { createClient } = require('redis');
const winston = require('winston');

// Load environment variables
dotenv.config();

// Import routers
const authRouter = require('./routes/auth');
const agentRouter = require('./routes/agents');
const designRouter = require('./routes/designs');
const blockchainRouter = require('./routes/blockchain');
const consensusRouter = require('./routes/consensus');

// Import middleware
const { authenticateToken } = require('./middleware/auth');
const { rateLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');

// Import services
const { LLMService } = require('./services/llmService');
const { ConsensusService } = require('./services/consensusService');
const { DesignEvolutionService } = require('./services/designEvolutionService');

// Initialize express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
});

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// Database connections
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/collective-creation', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  logger.info('Connected to MongoDB');
}).catch(err => {
  logger.error('MongoDB connection error:', err);
  process.exit(1);
});

// Redis connection
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.connect().then(() => {
  logger.info('Connected to Redis');
});

// Initialize services
const llmService = new LLMService();
const consensusService = new ConsensusService(redisClient);
const designEvolutionService = new DesignEvolutionService(llmService, consensusService);

// Make services available to routes
app.set('llmService', llmService);
app.set('consensusService', consensusService);
app.set('designEvolutionService', designEvolutionService);
app.set('redisClient', redisClient);
app.set('io', io);

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/agents', authenticateToken, agentRouter);
app.use('/api/designs', authenticateToken, designRouter);
app.use('/api/blockchain', authenticateToken, blockchainRouter);
app.use('/api/consensus', authenticateToken, consensusRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      redis: redisClient.isOpen ? 'connected' : 'disconnected'
    }
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info(`New client connected: ${socket.id}`);
  
  // Join design room
  socket.on('join-design', async (designId) => {
    socket.join(`design-${designId}`);
    logger.info(`Client ${socket.id} joined design room: ${designId}`);
    
    // Send current design state
    const designState = await designEvolutionService.getDesignState(designId);
    socket.emit('design-state', designState);
  });
  
  // Handle design modifications
  socket.on('modify-design', async (data) => {
    const { designId, agentId, modification } = data;
    
    try {
      const result = await designEvolutionService.applyModification(
        designId,
        agentId,
        modification
      );
      
      // Broadcast to all clients in the design room
      io.to(`design-${designId}`).emit('design-updated', result);
    } catch (error) {
      logger.error('Design modification error:', error);
      socket.emit('error', { message: 'Failed to apply modification' });
    }
  });
  
  // Handle consensus requests
  socket.on('request-consensus', async (data) => {
    const { designId, proposal } = data;
    
    try {
      const result = await consensusService.initiateConsensus(designId, proposal);
      io.to(`design-${designId}`).emit('consensus-initiated', result);
    } catch (error) {
      logger.error('Consensus error:', error);
      socket.emit('error', { message: 'Failed to initiate consensus' });
    }
  });
  
  // Handle agent feedback
  socket.on('agent-feedback', async (data) => {
    const { designId, agentId, feedback } = data;
    
    try {
      await llmService.processFeedback(agentId, feedback);
      io.to(`design-${designId}`).emit('feedback-received', {
        agentId,
        feedback,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Feedback processing error:', error);
      socket.emit('error', { message: 'Failed to process feedback' });
    }
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  await mongoose.connection.close();
  await redisClient.quit();
  process.exit(0);
});

module.exports = { app, server };