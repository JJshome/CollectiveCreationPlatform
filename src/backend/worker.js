const amqp = require('amqplib');
const { MongoClient } = require('mongodb');
const Redis = require('redis');
const { ethers } = require('ethers');

class CollectiveCreationWorker {
    constructor() {
        this.mongodb = null;
        this.redis = null;
        this.rabbitmq = null;
        this.blockchain = null;
        this.isRunning = false;
    }

    async initialize() {
        try {
            // Connect to MongoDB
            this.mongodb = new MongoClient(process.env.MONGODB_URI);
            await this.mongodb.connect();
            console.log('✅ Connected to MongoDB');

            // Connect to Redis
            this.redis = Redis.createClient({ url: process.env.REDIS_URL });
            await this.redis.connect();
            console.log('✅ Connected to Redis');

            // Connect to RabbitMQ
            this.rabbitmq = await amqp.connect(process.env.RABBITMQ_URL);
            const channel = await this.rabbitmq.createChannel();
            
            // Declare queues
            await channel.assertQueue('project_processing', { durable: true });
            await channel.assertQueue('agent_tasks', { durable: true });
            await channel.assertQueue('blockchain_transactions', { durable: true });
            await channel.assertQueue('emotion_analysis', { durable: true });
            
            console.log('✅ Connected to RabbitMQ');

            // Connect to blockchain
            if (process.env.BLOCKCHAIN_RPC_URL) {
                this.blockchain = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
                console.log('✅ Connected to Blockchain');
            }

            this.isRunning = true;
            await this.startProcessing();

        } catch (error) {
            console.error('❌ Worker initialization failed:', error);
            process.exit(1);
        }
    }

    async startProcessing() {
        const channel = await this.rabbitmq.createChannel();
        
        // Process project creation tasks
        await channel.consume('project_processing', async (msg) => {
            if (msg) {
                try {
                    const task = JSON.parse(msg.content.toString());
                    await this.processProjectTask(task);
                    channel.ack(msg);
                    console.log('✅ Processed project task:', task.id);
                } catch (error) {
                    console.error('❌ Project task processing failed:', error);
                    channel.nack(msg, false, false);
                }
            }
        });

        // Process virtual agent tasks
        await channel.consume('agent_tasks', async (msg) => {
            if (msg) {
                try {
                    const task = JSON.parse(msg.content.toString());
                    await this.processAgentTask(task);
                    channel.ack(msg);
                    console.log('✅ Processed agent task:', task.id);
                } catch (error) {
                    console.error('❌ Agent task processing failed:', error);
                    channel.nack(msg, false, false);
                }
            }
        });

        // Process blockchain transactions
        await channel.consume('blockchain_transactions', async (msg) => {
            if (msg) {
                try {
                    const task = JSON.parse(msg.content.toString());
                    await this.processBlockchainTask(task);
                    channel.ack(msg);
                    console.log('✅ Processed blockchain task:', task.id);
                } catch (error) {
                    console.error('❌ Blockchain task processing failed:', error);
                    channel.nack(msg, false, false);
                }
            }
        });

        // Process emotion analysis tasks
        await channel.consume('emotion_analysis', async (msg) => {
            if (msg) {
                try {
                    const task = JSON.parse(msg.content.toString());
                    await this.processEmotionAnalysis(task);
                    channel.ack(msg);
                    console.log('✅ Processed emotion analysis task:', task.id);
                } catch (error) {
                    console.error('❌ Emotion analysis processing failed:', error);
                    channel.nack(msg, false, false);
                }
            }
        });

        console.log('🚀 Worker is now processing tasks...');
    }

    async processProjectTask(task) {
        const db = this.mongodb.db('collective-creation');
        const projects = db.collection('projects');
        
        switch (task.type) {
            case 'create_project':
                // Initialize project with AI analysis
                const projectData = {
                    ...task.data,
                    status: 'initializing',
                    createdAt: new Date(),
                    aiAnalysis: await this.analyzeProjectRequirements(task.data)
                };
                
                await projects.insertOne(projectData);
                
                // Cache project for quick access
                await this.redis.setEx(
                    `project:${task.data.id}`, 
                    3600, 
                    JSON.stringify(projectData)
                );
                break;

            case 'update_project_status':
                await projects.updateOne(
                    { _id: task.data.projectId },
                    { 
                        $set: { 
                            status: task.data.status,
                            updatedAt: new Date()
                        }
                    }
                );
                break;

            case 'generate_project_insights':
                const insights = await this.generateProjectInsights(task.data);
                await projects.updateOne(
                    { _id: task.data.projectId },
                    { $set: { insights, updatedAt: new Date() } }
                );
                break;
        }
    }

    async processAgentTask(task) {
        const db = this.mongodb.db('collective-creation');
        const agents = db.collection('virtualAgents');
        
        switch (task.type) {
            case 'agent_interaction':
                // Process agent-to-agent or agent-to-user interaction
                const interaction = await this.processAgentInteraction(task.data);
                
                await agents.updateOne(
                    { _id: task.data.agentId },
                    { 
                        $push: { 
                            interactions: {
                                ...interaction,
                                timestamp: new Date()
                            }
                        },
                        $set: { updatedAt: new Date() }
                    },
                    { upsert: true }
                );
                break;

            case 'agent_learning':
                // Update agent's learning model
                await this.updateAgentLearning(task.data);
                break;

            case 'collaborative_task':
                // Handle collaborative tasks between agents
                await this.processCollaborativeTask(task.data);
                break;
        }
    }

    async processBlockchainTask(task) {
        if (!this.blockchain) {
            throw new Error('Blockchain not connected');
        }

        const db = this.mongodb.db('collective-creation');
        const transactions = db.collection('blockchainTransactions');
        
        switch (task.type) {
            case 'mint_nft':
                const nftResult = await this.mintNFT(task.data);
                await transactions.insertOne({
                    type: 'nft_mint',
                    txHash: nftResult.hash,
                    data: task.data,
                    status: 'pending',
                    createdAt: new Date()
                });
                break;

            case 'transfer_tokens':
                const transferResult = await this.transferTokens(task.data);
                await transactions.insertOne({
                    type: 'token_transfer',
                    txHash: transferResult.hash,
                    data: task.data,
                    status: 'pending',
                    createdAt: new Date()
                });
                break;

            case 'create_dao_proposal':
                const proposalResult = await this.createDAOProposal(task.data);
                await transactions.insertOne({
                    type: 'dao_proposal',
                    txHash: proposalResult.hash,
                    data: task.data,
                    status: 'pending',
                    createdAt: new Date()
                });
                break;
        }
    }

    async processEmotionAnalysis(task) {
        const db = this.mongodb.db('collective-creation');
        const emotions = db.collection('emotionAnalysis');
        
        // Simulate emotion analysis (replace with actual ML model)
        const analysis = await this.analyzeEmotion(task.data.text);
        
        await emotions.insertOne({
            userId: task.data.userId,
            text: task.data.text,
            analysis,
            context: task.data.context,
            timestamp: new Date()
        });

        // Update user's emotional profile
        const users = db.collection('users');
        await users.updateOne(
            { _id: task.data.userId },
            { 
                $set: { 
                    lastEmotionAnalysis: analysis,
                    updatedAt: new Date()
                }
            }
        );
    }

    async analyzeProjectRequirements(projectData) {
        // Simulate AI analysis of project requirements
        return {
            complexity: Math.random() > 0.5 ? 'high' : 'medium',
            estimatedDuration: Math.floor(Math.random() * 30) + 1,
            recommendedTeamSize: Math.floor(Math.random() * 8) + 3,
            suggestedSkills: ['collaboration', 'creativity', 'analysis'],
            riskFactors: ['timeline', 'resource_availability']
        };
    }

    async generateProjectInsights(data) {
        // Generate insights based on project progress
        return {
            progressRate: Math.random(),
            teamEfficiency: Math.random(),
            qualityScore: Math.random(),
            recommendedActions: ['increase_collaboration', 'schedule_review'],
            generatedAt: new Date()
        };
    }

    async processAgentInteraction(data) {
        // Process virtual agent interactions
        return {
            type: data.interactionType,
            participants: data.participants,
            outcome: 'successful',
            learningPoints: ['improved_communication', 'enhanced_collaboration']
        };
    }

    async updateAgentLearning(data) {
        // Update agent learning model based on interactions
        const db = this.mongodb.db('collective-creation');
        const agents = db.collection('virtualAgents');
        
        await agents.updateOne(
            { _id: data.agentId },
            { 
                $inc: { 'learning.experiencePoints': data.points },
                $push: { 'learning.skills': data.newSkills },
                $set: { updatedAt: new Date() }
            }
        );
    }

    async processCollaborativeTask(data) {
        // Handle collaborative tasks between multiple agents
        const db = this.mongodb.db('collective-creation');
        const collaborations = db.collection('collaborations');
        
        await collaborations.insertOne({
            taskId: data.task.id,
            participants: data.participants,
            status: 'in_progress',
            startedAt: new Date(),
            expectedCompletion: new Date(Date.now() + data.estimatedDuration * 60000)
        });
    }

    async mintNFT(data) {
        // Simulate NFT minting (replace with actual smart contract interaction)
        return {
            hash: '0x' + Math.random().toString(36).substr(2, 64),
            tokenId: Math.floor(Math.random() * 1000000),
            to: data.recipient,
            metadata: data.metadata
        };
    }

    async transferTokens(data) {
        // Simulate token transfer
        return {
            hash: '0x' + Math.random().toString(36).substr(2, 64),
            from: data.from,
            to: data.to,
            amount: data.amount
        };
    }

    async createDAOProposal(data) {
        // Simulate DAO proposal creation
        return {
            hash: '0x' + Math.random().toString(36).substr(2, 64),
            proposalId: Math.floor(Math.random() * 1000),
            description: data.description,
            votingPeriod: data.votingPeriod
        };
    }

    async analyzeEmotion(text) {
        // Simulate emotion analysis (replace with actual sentiment analysis)
        const emotions = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'neutral'];
        const primary = emotions[Math.floor(Math.random() * emotions.length)];
        
        return {
            primary,
            confidence: Math.random(),
            secondary: emotions.filter(e => e !== primary)[0],
            intensity: Math.random(),
            context_awareness: Math.random()
        };
    }

    async shutdown() {
        console.log('🛑 Shutting down worker...');
        
        if (this.rabbitmq) {
            await this.rabbitmq.close();
        }
        
        if (this.redis) {
            await this.redis.quit();
        }
        
        if (this.mongodb) {
            await this.mongodb.close();
        }
        
        this.isRunning = false;
        console.log('✅ Worker shutdown complete');
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    if (worker) {
        await worker.shutdown();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    if (worker) {
        await worker.shutdown();
    }
    process.exit(0);
});

// Start the worker
const worker = new CollectiveCreationWorker();
worker.initialize().catch(error => {
    console.error('❌ Failed to start worker:', error);
    process.exit(1);
});
