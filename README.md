# Collective Creation Platform

![Platform Overview](doc/images/platform_overview.svg)

## Overview

The Collective Creation Platform is an innovative AI-powered system that enables collaborative fashion design through multiple Large Language Model (LLM) instances. This platform demonstrates the future of collective intelligence in creative industries, where AI agents with distinct personalities collaborate to create unique designs through iterative refinement.

## Key Features

### 🤖 Multi-Agent AI System
- **Personalized LLM Instances**: Each AI agent has unique design preferences and personality traits
- **Autonomous Virtual Human Agents**: AI agents that can operate independently on behalf of users
- **Adaptive Learning**: System continuously improves based on collective feedback
- **Real-time Emotional Intelligence**: Agents respond to user emotions and situational context

![AI Agents Interaction](doc/images/ai_agents_interaction.svg)

### 🎨 Dynamic Design Evolution
- **Real-time Visualization**: Watch designs evolve through collaborative iterations
- **Consensus Building**: AI agents reach design decisions through structured negotiation
- **Version Control**: Track every design iteration with complete history
- **Collective Imagination**: AI-driven dynamic world generation based on user input

### 🔗 Blockchain-Powered Virtual Economy
- **NFT-based Rewards**: Contributors receive blockchain-verified assets for participation
- **Transparent Attribution**: Every design contribution is permanently recorded
- **Virtual Marketplace**: Trade and exchange design assets in a decentralized ecosystem
- **Smart Contract Automation**: Automated reward distribution and asset management

![Blockchain Economy](doc/images/blockchain_economy.svg)

### 💭 Emotional & Contextual Awareness
- **Real-time Emotion Recognition**: Analyze user emotions from text, voice, and behavior
- **Situational Intelligence**: Adapt responses based on context and environment
- **Personalized Interactions**: Tailor communication style to user's emotional state
- **Predictive Emotional Support**: Proactive assistance based on emotional patterns

## System Architecture

### Core Services

1. **LLM Service**
   - Creates and manages personalized AI agents
   - Handles inter-agent communication protocols
   - Maintains agent state and preferences
   - Provides intelligent content generation

2. **Virtual Human Agent Service**
   - Manages autonomous virtual agents
   - Facilitates agent-to-agent interactions
   - Handles agent learning and evolution
   - Coordinates collaborative sessions

3. **Emotion Recognition Service**
   - Real-time emotion analysis from multiple inputs
   - Contextual awareness and situation recognition
   - Adaptive response generation
   - Emotional pattern learning and prediction

4. **Blockchain Service**
   - NFT minting and management
   - Virtual asset creation and trading
   - Reward token distribution
   - Marketplace operations

5. **Design Evolution Engine**
   - Processes design modifications in real-time
   - Manages visual rendering pipeline
   - Implements constraint-based design rules

6. **Consensus Protocol**
   - Facilitates democratic decision-making among AI agents
   - Implements weighted voting based on expertise
   - Resolves design conflicts through negotiation

![System Architecture](doc/images/system_architecture.svg)

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js >= 18.0.0 (if running locally)
- 8GB+ RAM (recommended)
- 50GB+ available disk space

### Option 1: Docker Deployment (Recommended)

```bash
# Clone the repository
git clone https://github.com/JJshome/CollectiveCreationPlatform.git
cd CollectiveCreationPlatform

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
```

Access the platform:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **MongoDB Admin**: http://localhost:8081 (admin:admin)
- **Redis Admin**: http://localhost:8082
- **Grafana**: http://localhost:3001 (admin:grafana123)

### Option 2: Local Development

```bash
# Clone repository
git clone https://github.com/JJshome/CollectiveCreationPlatform.git
cd CollectiveCreationPlatform

# Backend setup
cd src/backend
cp .env.example .env
npm install
npm run dev

# Frontend setup (new terminal)
cd src/frontend
npm install
npm start

# Worker process (new terminal)
cd src/backend
npm run worker
```

### Environment Configuration

Edit `src/backend/.env`:

```env
# Database
MONGODB_URI=mongodb://admin:password123@localhost:27017/collective-creation?authSource=admin
REDIS_URL=redis://:redis123@localhost:6379

# Blockchain
BLOCKCHAIN_RPC_URL=http://localhost:8545
BLOCKCHAIN_PRIVATE_KEY=0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d

# Authentication
JWT_SECRET=your-super-secret-jwt-key

# Features (enable/disable)
FEATURE_BLOCKCHAIN_ENABLED=true
FEATURE_EMOTION_ANALYSIS_ENABLED=true
FEATURE_VIRTUAL_AGENTS_ENABLED=true

# External APIs (optional)
OPENAI_API_KEY=your-openai-key
HUGGINGFACE_API_KEY=your-huggingface-key
```

## Development Workflow

### Running Tests

```bash
# Backend tests
cd src/backend
npm test
npm run test:coverage

# Frontend tests
cd src/frontend
npm test
npm run test:coverage
```

### Code Quality

```bash
# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format

# Type checking (if using TypeScript)
npm run type-check
```

### Database Management

```bash
# Initialize database with sample data
docker-compose exec mongodb mongo collective-creation /scripts/mongo-init.js

# Create database backup
docker-compose exec mongodb mongodump --uri "mongodb://admin:password123@localhost:27017/collective-creation?authSource=admin" --out /backup

# Restore database
docker-compose exec mongodb mongorestore --uri "mongodb://admin:password123@localhost:27017" /backup/collective-creation
```

### Monitoring & Debugging

```bash
# View all service logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f mongodb
docker-compose logs -f redis

# Check service health
curl http://localhost:5000/health

# Monitor resource usage
docker stats
```

## API Usage Examples

### Authentication

```bash
# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "designer",
    "email": "designer@example.com",
    "password": "password123"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "designer@example.com",
    "password": "password123"
  }'
```

### Project Management

```bash
# Create project
curl -X POST http://localhost:5000/api/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sustainable Fashion Line",
    "description": "Creating eco-friendly clothing designs",
    "category": "fashion"
  }'

# Get projects
curl -X GET http://localhost:5000/api/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Virtual Agent Operations

```bash
# Create virtual agent
curl -X POST http://localhost:5000/api/agents/virtual \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DesignBot",
    "type": "design",
    "capabilities": ["pattern-recognition", "color-harmony"]
  }'

# Start agent collaboration
curl -X POST http://localhost:5000/api/agents/collaborate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agentIds": ["agent1", "agent2"],
    "task": "design_improvement",
    "context": "sustainable_fashion"
  }'
```

## Docker Profiles

The platform supports different deployment profiles:

```bash
# Development (basic services)
docker-compose up -d

# With monitoring
docker-compose --profile monitoring up -d

# With logging (ELK stack)
docker-compose --profile logging up -d

# With background job processing
docker-compose --profile queue up -d

# Full production setup
docker-compose --profile production --profile monitoring --profile logging up -d
```

## Scaling & Performance

### Horizontal Scaling

```bash
# Scale backend instances
docker-compose up -d --scale backend=3

# Scale worker instances
docker-compose --profile queue up -d --scale worker=5

# Load balancer will automatically distribute traffic
```

### Performance Tuning

```yaml
# docker-compose.override.yml
version: '3.8'
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
  
  mongodb:
    command: mongod --wiredTigerCacheSizeGB=2
```

## Troubleshooting

### Common Issues

1. **Port conflicts**
   ```bash
   # Check which ports are in use
   netstat -tulpn | grep LISTEN
   
   # Modify docker-compose.yml ports if needed
   ```

2. **Out of memory**
   ```bash
   # Check container memory usage
   docker stats
   
   # Increase Docker memory limit in Docker Desktop
   ```

3. **Database connection issues**
   ```bash
   # Check MongoDB logs
   docker-compose logs mongodb
   
   # Verify connection string in .env file
   ```

4. **Blockchain connection**
   ```bash
   # Check Ganache status
   docker-compose logs ganache
   
   # Verify RPC URL accessibility
   curl http://localhost:8545
   ```

### Log Analysis

```bash
# Aggregate logs from all services
docker-compose logs --tail=100 -f > platform.log

# Search for specific errors
grep -i error platform.log
grep -i "failed" platform.log

# Monitor real-time errors
docker-compose logs -f | grep ERROR
```

## Production Deployment

### Security Checklist

- [ ] Change default passwords in all services
- [ ] Enable SSL/TLS with proper certificates
- [ ] Configure firewall rules
- [ ] Set up proper backup procedures
- [ ] Enable audit logging
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerting

### Environment Variables for Production

```env
NODE_ENV=production
MONGODB_URI=mongodb://production-cluster/collective-creation
REDIS_URL=rediss://production-redis:6380
BLOCKCHAIN_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
JWT_SECRET=complex-production-secret
SSL_CERT_PATH=/etc/ssl/certs/cert.pem
SSL_KEY_PATH=/etc/ssl/private/key.pem
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow ESLint configuration
- Write tests for new features
- Update documentation
- Use conventional commit messages
- Ensure Docker builds succeed

## License

This project is proprietary and patent-pending.

## Support

- **Documentation**: [GitHub Wiki](https://github.com/JJshome/CollectiveCreationPlatform/wiki)
- **Issues**: [GitHub Issues](https://github.com/JJshome/CollectiveCreationPlatform/issues)
- **Discussions**: [GitHub Discussions](https://github.com/JJshome/CollectiveCreationPlatform/discussions)

---

*Patent Pending - Collective Creation Platform represents the future of AI-powered collaborative creativity with emotional intelligence and blockchain-verified ownership.*
