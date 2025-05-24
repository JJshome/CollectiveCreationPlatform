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
const BlockchainService = require('./services/blockchainService');
const EmotionRecognitionService = require('./services/emotionService');
const VirtualHumanAgentService = require('./services/virtualAgentService');

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
const blockchainService = new BlockchainService();
const emotionService = new EmotionRecognitionService();
const virtualAgentService = new VirtualHumanAgentService(llmService, emotionService, blockchainService);

// Service initialization handlers
emotionService.on('initialized', () => {
  logger.info('Emotion recognition service initialized');
});

virtualAgentService.on('initialized', () => {
  logger.info('Virtual agent service initialized');
});

blockchainService.on('initialized', () => {
  logger.info('Blockchain service initialized');
});

// Make services available to routes
app.set('llmService', llmService);
app.set('consensusService', consensusService);
app.set('designEvolutionService', designEvolutionService);
app.set('blockchainService', blockchainService);
app.set('emotionService', emotionService);
app.set('virtualAgentService', virtualAgentService);
app.set('redisClient', redisClient);
app.set('io', io);

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/agents', authenticateToken, agentRouter);
app.use('/api/designs', authenticateToken, designRouter);
app.use('/api/blockchain', authenticateToken, blockchainRouter);
app.use('/api/consensus', authenticateToken, consensusRouter);

// New API endpoints for additional services

// Emotion recognition endpoints
app.post('/api/emotion/analyze', authenticateToken, async (req, res) => {
  try {
    const { userId, inputData } = req.body;
    const analysis = await emotionService.analyzeUserEmotion(userId, inputData);
    res.json(analysis);
  } catch (error) {
    logger.error('Emotion analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze emotion' });
  }
});

app.get('/api/emotion/state/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const emotionState = emotionService.getCurrentEmotionState(userId);
    res.json(emotionState);
  } catch (error) {
    logger.error('Get emotion state error:', error);
    res.status(500).json({ error: 'Failed to get emotion state' });
  }
});

app.get('/api/emotion/analytics/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const analytics = emotionService.getEmotionAnalytics(userId);
    res.json(analytics);
  } catch (error) {
    logger.error('Get emotion analytics error:', error);
    res.status(500).json({ error: 'Failed to get emotion analytics' });
  }
});

// Virtual agent endpoints
app.post('/api/agents/virtual/create', authenticateToken, async (req, res) => {
  try {
    const { userId, preferences } = req.body;
    const agent = await virtualAgentService.createVirtualAgent(userId, preferences);
    res.json(agent);
  } catch (error) {
    logger.error('Virtual agent creation error:', error);
    res.status(500).json({ error: 'Failed to create virtual agent' });
  }
});

app.post('/api/agents/virtual/:agentId/autonomy', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { level } = req.body;
    await virtualAgentService.activateAgentAutonomy(agentId, level);
    res.json({ success: true, message: 'Agent autonomy activated' });
  } catch (error) {
    logger.error('Agent autonomy activation error:', error);
    res.status(500).json({ error: 'Failed to activate autonomy' });
  }
});

app.get('/api/agents/virtual/:agentId/status', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const status = virtualAgentService.getAgentStatus(agentId);
    if (!status) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(status);
  } catch (error) {
    logger.error('Get agent status error:', error);
    res.status(500).json({ error: 'Failed to get agent status' });
  }
});

app.post('/api/agents/virtual/interact', authenticateToken, async (req, res) => {
  try {
    const { agentId1, agentId2, context } = req.body;
    const interaction = await virtualAgentService.facilitateAgentInteraction(agentId1, agentId2, context);
    res.json(interaction);
  } catch (error) {
    logger.error('Agent interaction error:', error);
    res.status(500).json({ error: 'Failed to facilitate interaction' });
  }
});

app.post('/api/agents/virtual/collaborate', authenticateToken, async (req, res) => {
  try {
    const { agentIds, projectContext } = req.body;
    const session = await virtualAgentService.startCollaborationSession(agentIds, projectContext);
    res.json(session);
  } catch (error) {
    logger.error('Collaboration session error:', error);
    res.status(500).json({ error: 'Failed to start collaboration' });
  }
});

// Blockchain endpoints
app.post('/api/blockchain/wallet/create', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.body;
    const wallet = await blockchainService.createUserWallet(userId);
    res.json(wallet);
  } catch (error) {
    logger.error('Wallet creation error:', error);
    res.status(500).json({ error: 'Failed to create wallet' });
  }
});

app.post('/api/blockchain/nft/mint', authenticateToken, async (req, res) => {
  try {
    const { userId, projectId, contributionData } = req.body;
    const nft = await blockchainService.mintCollaborationNFT(userId, projectId, contributionData);
    res.json(nft);
  } catch (error) {
    logger.error('NFT minting error:', error);
    res.status(500).json({ error: 'Failed to mint NFT' });
  }
});

app.post('/api/blockchain/rewards/distribute', authenticateToken, async (req, res) => {
  try {
    const { participants, totalReward, projectId } = req.body;
    const distributions = await blockchainService.distributeRewardTokens(participants, totalReward, projectId);
    res.json(distributions);
  } catch (error) {
    logger.error('Reward distribution error:', error);
    res.status(500).json({ error: 'Failed to distribute rewards' });
  }
});

app.get('/api/blockchain/assets/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const assets = await blockchainService.getUserAssets(userId);
    res.json(assets);
  } catch (error) {
    logger.error('Get user assets error:', error);
    res.status(500).json({ error: 'Failed to get user assets' });
  }
});

app.post('/api/blockchain/marketplace/list', authenticateToken, async (req, res) => {
  try {
    const { userId, tokenId, price, currency } = req.body;
    const listing = await blockchainService.createMarketplaceListing(userId, tokenId, price, currency);
    res.json(listing);
  } catch (error) {
    logger.error('Marketplace listing error:', error);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

app.get('/api/blockchain/marketplace', authenticateToken, async (req, res) => {
  try {
    const filters = req.query;
    const listings = await blockchainService.getMarketplaceListings(filters);
    res.json(listings);
  } catch (error) {
    logger.error('Get marketplace listings error:', error);
    res.status(500).json({ error: 'Failed to get listings' });
  }
});

app.post('/api/blockchain/marketplace/purchase', authenticateToken, async (req, res) => {
  try {
    const { buyerId, listingId } = req.body;
    const purchase = await blockchainService.purchaseNFT(buyerId, listingId);
    res.json(purchase);
  } catch (error) {
    logger.error('NFT purchase error:', error);
    res.status(500).json({ error: 'Failed to purchase NFT' });
  }
});

app.get('/api/blockchain/analytics', authenticateToken, async (req, res) => {
  try {
    const analytics = await blockchainService.getBlockchainAnalytics();
    res.json(analytics);
  } catch (error) {
    logger.error('Blockchain analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const services = {
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    redis: redisClient.isOpen ? 'connected' : 'disconnected',
    llm: 'active',
    emotion: 'active',
    blockchain: 'active',
    virtualAgents: 'active'
  };

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services
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

  // Handle emotion updates
  socket.on('emotion-update', async (data) => {
    const { userId, inputData } = data;
    
    try {
      const analysis = await emotionService.analyzeUserEmotion(userId, inputData);
      socket.emit('emotion-analysis', analysis);
      
      // Broadcast emotion state changes to relevant rooms
      socket.broadcast.emit('user-emotion-changed', {
        userId,
        emotionState: analysis.emotionState
      });
    } catch (error) {
      logger.error('Emotion update error:', error);
      socket.emit('error', { message: 'Failed to process emotion update' });
    }
  });

  // Handle virtual agent interactions
  socket.on('agent-message', async (data) => {
    const { agentId, message, context } = data;
    
    try {
      // Process agent learning from message
      await virtualAgentService.processAgentLearning(agentId, {
        interaction: {
          type: 'user_message',
          content: message,
          context: context,
          timestamp: Date.now()
        }
      });

      // Generate agent response through LLM
      const response = await llmService.generateResponse(message, {
        agentId: agentId,
        context: context
      });

      socket.emit('agent-response', {
        agentId,
        response,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Agent message error:', error);
      socket.emit('error', { message: 'Failed to process agent message' });
    }
  });

  // Handle blockchain events
  socket.on('nft-mint-request', async (data) => {
    const { userId, projectId, contributionData } = data;
    
    try {
      const nft = await blockchainService.mintCollaborationNFT(userId, projectId, contributionData);
      socket.emit('nft-minted', nft);
      
      // Broadcast to project room
      io.to(`project-${projectId}`).emit('nft-created', {
        userId,
        nft,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('NFT mint request error:', error);
      socket.emit('error', { message: 'Failed to mint NFT' });
    }
  });

  // Join project room for blockchain events
  socket.on('join-project', (projectId) => {
    socket.join(`project-${projectId}`);
    logger.info(`Client ${socket.id} joined project room: ${projectId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Service event handlers
emotionService.on('emotionUpdated', (data) => {
  // Broadcast emotion updates through WebSocket
  io.emit('emotion-updated', data);
});

virtualAgentService.on('agentCreated', (data) => {
  io.emit('agent-created', data);
});

virtualAgentService.on('agentInteraction', (data) => {
  io.emit('agent-interaction', data);
});

virtualAgentService.on('collaborationStarted', (data) => {
  io.emit('collaboration-started', data);
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info('Services initialized:');
  logger.info('- LLM Service: ✓');
  logger.info('- Consensus Service: ✓');
  logger.info('- Design Evolution Service: ✓');
  logger.info('- Blockchain Service: ✓');
  logger.info('- Emotion Recognition Service: ✓');
  logger.info('- Virtual Agent Service: ✓');
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