// MongoDB initialization script
print('Starting MongoDB initialization...');

// Switch to collective-creation database
db = db.getSiblingDB('collective-creation');

// Create collections with validation schemas
print('Creating collections...');

// Users collection
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'username', 'hashedPassword'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        },
        username: {
          bsonType: 'string',
          minLength: 3,
          maxLength: 30
        },
        hashedPassword: {
          bsonType: 'string'
        },
        profile: {
          bsonType: 'object',
          properties: {
            firstName: { bsonType: 'string' },
            lastName: { bsonType: 'string' },
            avatar: { bsonType: 'string' },
            bio: { bsonType: 'string' },
            skills: { bsonType: 'array' },
            interests: { bsonType: 'array' }
          }
        },
        preferences: {
          bsonType: 'object',
          properties: {
            theme: { bsonType: 'string' },
            language: { bsonType: 'string' },
            notifications: { bsonType: 'object' }
          }
        },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
        lastLoginAt: { bsonType: 'date' },
        isActive: { bsonType: 'bool' },
        isVerified: { bsonType: 'bool' }
      }
    }
  }
});

// Projects collection
db.createCollection('projects', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['title', 'description', 'createdBy', 'status'],
      properties: {
        title: {
          bsonType: 'string',
          minLength: 3,
          maxLength: 100
        },
        description: {
          bsonType: 'string',
          minLength: 10
        },
        createdBy: { bsonType: 'objectId' },
        collaborators: { bsonType: 'array' },
        status: {
          bsonType: 'string',
          enum: ['draft', 'active', 'completed', 'archived', 'cancelled']
        },
        category: { bsonType: 'string' },
        tags: { bsonType: 'array' },
        assets: { bsonType: 'array' },
        metadata: { bsonType: 'object' },
        aiAnalysis: { bsonType: 'object' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
        deadline: { bsonType: 'date' }
      }
    }
  }
});

// Virtual Agents collection
db.createCollection('virtualAgents', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'type', 'ownerId'],
      properties: {
        name: {
          bsonType: 'string',
          minLength: 2,
          maxLength: 50
        },
        type: {
          bsonType: 'string',
          enum: ['design', 'analysis', 'collaboration', 'research', 'general']
        },
        ownerId: { bsonType: 'objectId' },
        personality: { bsonType: 'object' },
        capabilities: { bsonType: 'array' },
        learningModel: { bsonType: 'object' },
        interactions: { bsonType: 'array' },
        performance: { bsonType: 'object' },
        isActive: { bsonType: 'bool' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

// NFT Assets collection
db.createCollection('nftAssets', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['tokenId', 'contractAddress', 'ownerId', 'metadata'],
      properties: {
        tokenId: { bsonType: 'string' },
        contractAddress: { bsonType: 'string' },
        ownerId: { bsonType: 'objectId' },
        metadata: {
          bsonType: 'object',
          required: ['name', 'description', 'image'],
          properties: {
            name: { bsonType: 'string' },
            description: { bsonType: 'string' },
            image: { bsonType: 'string' },
            attributes: { bsonType: 'array' }
          }
        },
        price: { bsonType: 'object' },
        isForSale: { bsonType: 'bool' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

// Collaborations collection
db.createCollection('collaborations', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['projectId', 'participants', 'status'],
      properties: {
        projectId: { bsonType: 'objectId' },
        participants: { bsonType: 'array' },
        status: {
          bsonType: 'string',
          enum: ['pending', 'active', 'completed', 'cancelled']
        },
        tasks: { bsonType: 'array' },
        messages: { bsonType: 'array' },
        sharedAssets: { bsonType: 'array' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

// Emotion Analysis collection
db.createCollection('emotionAnalysis', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'text', 'analysis'],
      properties: {
        userId: { bsonType: 'objectId' },
        text: { bsonType: 'string' },
        analysis: {
          bsonType: 'object',
          properties: {
            primary: { bsonType: 'string' },
            confidence: { bsonType: 'double' },
            secondary: { bsonType: 'string' },
            intensity: { bsonType: 'double' }
          }
        },
        context: { bsonType: 'string' },
        timestamp: { bsonType: 'date' }
      }
    }
  }
});

// Blockchain Transactions collection
db.createCollection('blockchainTransactions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['txHash', 'type', 'status'],
      properties: {
        txHash: { bsonType: 'string' },
        type: {
          bsonType: 'string',
          enum: ['nft_mint', 'token_transfer', 'dao_proposal', 'marketplace_sale']
        },
        status: {
          bsonType: 'string',
          enum: ['pending', 'confirmed', 'failed']
        },
        fromAddress: { bsonType: 'string' },
        toAddress: { bsonType: 'string' },
        amount: { bsonType: 'string' },
        gasUsed: { bsonType: 'string' },
        gasPrice: { bsonType: 'string' },
        blockNumber: { bsonType: 'int' },
        data: { bsonType: 'object' },
        createdAt: { bsonType: 'date' },
        confirmedAt: { bsonType: 'date' }
      }
    }
  }
});

print('Collections created successfully.');

// Create indexes for better performance
print('Creating indexes...');

// Users indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ 'profile.skills': 1 });
db.users.createIndex({ 'profile.interests': 1 });
db.users.createIndex({ createdAt: -1 });
db.users.createIndex({ lastLoginAt: -1 });
db.users.createIndex({ isActive: 1, isVerified: 1 });

// Projects indexes
db.projects.createIndex({ createdBy: 1 });
db.projects.createIndex({ collaborators: 1 });
db.projects.createIndex({ status: 1 });
db.projects.createIndex({ category: 1 });
db.projects.createIndex({ tags: 1 });
db.projects.createIndex({ createdAt: -1 });
db.projects.createIndex({ updatedAt: -1 });
db.projects.createIndex({ title: 'text', description: 'text' });

// Virtual Agents indexes
db.virtualAgents.createIndex({ ownerId: 1 });
db.virtualAgents.createIndex({ type: 1 });
db.virtualAgents.createIndex({ isActive: 1 });
db.virtualAgents.createIndex({ createdAt: -1 });

// NFT Assets indexes
db.nftAssets.createIndex({ tokenId: 1, contractAddress: 1 }, { unique: true });
db.nftAssets.createIndex({ ownerId: 1 });
db.nftAssets.createIndex({ isForSale: 1 });
db.nftAssets.createIndex({ createdAt: -1 });
db.nftAssets.createIndex({ 'metadata.name': 'text', 'metadata.description': 'text' });

// Collaborations indexes
db.collaborations.createIndex({ projectId: 1 });
db.collaborations.createIndex({ participants: 1 });
db.collaborations.createIndex({ status: 1 });
db.collaborations.createIndex({ createdAt: -1 });

// Emotion Analysis indexes
db.emotionAnalysis.createIndex({ userId: 1 });
db.emotionAnalysis.createIndex({ timestamp: -1 });
db.emotionAnalysis.createIndex({ 'analysis.primary': 1 });

// Blockchain Transactions indexes
db.blockchainTransactions.createIndex({ txHash: 1 }, { unique: true });
db.blockchainTransactions.createIndex({ type: 1 });
db.blockchainTransactions.createIndex({ status: 1 });
db.blockchainTransactions.createIndex({ fromAddress: 1 });
db.blockchainTransactions.createIndex({ toAddress: 1 });
db.blockchainTransactions.createIndex({ createdAt: -1 });

print('Indexes created successfully.');

// Insert sample data for development
print('Inserting sample data...');

// Sample users
const sampleUsers = [
  {
    email: 'admin@example.com',
    username: 'admin',
    hashedPassword: '$2a$10$example', // This should be properly hashed in real implementation
    profile: {
      firstName: 'Admin',
      lastName: 'User',
      bio: 'Platform administrator',
      skills: ['management', 'system-administration'],
      interests: ['platform-development', 'user-experience']
    },
    preferences: {
      theme: 'dark',
      language: 'en',
      notifications: {
        email: true,
        push: true,
        collaboration: true
      }
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    isVerified: true
  },
  {
    email: 'designer@example.com',
    username: 'designer',
    hashedPassword: '$2a$10$example',
    profile: {
      firstName: 'Creative',
      lastName: 'Designer',
      bio: 'Fashion designer with 5 years of experience',
      skills: ['fashion-design', 'illustration', 'color-theory'],
      interests: ['sustainable-fashion', 'ai-collaboration', 'textile-innovation']
    },
    preferences: {
      theme: 'light',
      language: 'en',
      notifications: {
        email: true,
        push: false,
        collaboration: true
      }
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    isVerified: true
  }
];

const insertedUsers = db.users.insertMany(sampleUsers);
print(`Inserted ${insertedUsers.insertedIds.length} sample users.`);

// Sample projects
const sampleProjects = [
  {
    title: 'Sustainable Fashion Collection',
    description: 'Creating an eco-friendly fashion line using recycled materials and AI-assisted design optimization.',
    createdBy: insertedUsers.insertedIds[1],
    collaborators: [insertedUsers.insertedIds[0]],
    status: 'active',
    category: 'fashion',
    tags: ['sustainable', 'eco-friendly', 'recycled-materials', 'ai-design'],
    assets: [],
    metadata: {
      targetAudience: 'environmentally-conscious consumers',
      budget: 50000,
      timeline: '6 months'
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    deadline: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000) // 6 months from now
  }
];

const insertedProjects = db.projects.insertMany(sampleProjects);
print(`Inserted ${insertedProjects.insertedIds.length} sample projects.`);

// Sample virtual agents
const sampleAgents = [
  {
    name: 'DesignBot',
    type: 'design',
    ownerId: insertedUsers.insertedIds[1],
    personality: {
      creativity: 0.9,
      analytical: 0.7,
      collaboration: 0.8,
      innovation: 0.85
    },
    capabilities: [
      'pattern-recognition',
      'color-harmony',
      'trend-analysis',
      'material-suggestion'
    ],
    learningModel: {
      version: '1.0',
      trainingData: 'fashion-design-corpus',
      lastUpdated: new Date(),
      performanceScore: 0.82
    },
    interactions: [],
    performance: {
      tasksCompleted: 0,
      averageRating: 0,
      uptime: 0.99
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'CollabHelper',
    type: 'collaboration',
    ownerId: insertedUsers.insertedIds[0],
    personality: {
      creativity: 0.6,
      analytical: 0.8,
      collaboration: 0.95,
      empathy: 0.9
    },
    capabilities: [
      'team-coordination',
      'conflict-resolution',
      'progress-tracking',
      'communication-facilitation'
    ],
    learningModel: {
      version: '1.0',
      trainingData: 'collaboration-patterns',
      lastUpdated: new Date(),
      performanceScore: 0.88
    },
    interactions: [],
    performance: {
      tasksCompleted: 0,
      averageRating: 0,
      uptime: 0.97
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const insertedAgents = db.virtualAgents.insertMany(sampleAgents);
print(`Inserted ${insertedAgents.insertedIds.length} sample virtual agents.`);

// Create admin user with proper role
db.users.updateOne(
  { email: 'admin@example.com' },
  { 
    $set: { 
      role: 'admin',
      permissions: [
        'user-management',
        'project-management',
        'system-administration',
        'analytics-access'
      ]
    } 
  }
);

print('MongoDB initialization completed successfully!');
print('Collections created: users, projects, virtualAgents, nftAssets, collaborations, emotionAnalysis, blockchainTransactions');
print('Sample data inserted for development environment.');
print('Database is ready for use.');
