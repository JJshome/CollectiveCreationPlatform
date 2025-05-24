const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
});

class DesignEvolutionService {
  constructor(llmService, consensusService) {
    this.llmService = llmService;
    this.consensusService = consensusService;
    this.designs = new Map();
    this.evolutionHistory = new Map();
  }

  async createDesign(initialParams) {
    const designId = `design-${uuidv4()}`;
    
    const design = {
      id: designId,
      created: new Date(),
      currentVersion: 1,
      iterations: [],
      currentState: {
        bodyColor: initialParams.bodyColor || '#2C3E50',
        collarType: initialParams.collarType || 'stand',
        collarColor: initialParams.collarColor || '#34495E',
        sleeveLength: initialParams.sleeveLength || 'full',
        sleeveColor: initialParams.sleeveColor || '#2C3E50',
        pocketCount: initialParams.pocketCount || 2,
        pocketStyle: initialParams.pocketStyle || 'flap',
        materials: initialParams.materials || ['tech-fabric'],
        pattern: initialParams.pattern || 'solid',
        features: initialParams.features || [],
        colors: [initialParams.bodyColor || '#2C3E50']
      },
      metadata: {
        name: initialParams.name || 'Untitled Design',
        description: initialParams.description || '',
        tags: initialParams.tags || [],
        creator: initialParams.creator || 'system'
      }
    };

    // Store initial state as first iteration
    design.iterations.push({
      version: 1,
      timestamp: new Date(),
      state: JSON.parse(JSON.stringify(design.currentState)),
      changes: [],
      contributors: []
    });

    this.designs.set(designId, design);
    this.evolutionHistory.set(designId, []);

    logger.info(`Created new design: ${designId}`);
    return design;
  }

  async getDesignState(designId) {
    const design = this.designs.get(designId);
    if (!design) {
      throw new Error(`Design ${designId} not found`);
    }
    return design.currentState;
  }

  async applyModification(designId, agentId, modification) {
    const design = this.designs.get(designId);
    if (!design) {
      throw new Error(`Design ${designId} not found`);
    }

    const agent = this.llmService.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Create new state based on modification
    const newState = JSON.parse(JSON.stringify(design.currentState));
    const changes = [];

    // Apply modifications
    Object.keys(modification).forEach(key => {
      if (newState.hasOwnProperty(key)) {
        const oldValue = newState[key];
        const newValue = modification[key];
        
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changes.push({
            property: key,
            oldValue: oldValue,
            newValue: newValue,
            agentId: agentId,
            agentName: agent.name
          });
          newState[key] = newValue;
        }
      }
    });

    if (changes.length === 0) {
      return {
        designId,
        message: 'No changes applied',
        currentState: design.currentState
      };
    }

    // Create new iteration
    const newVersion = design.currentVersion + 1;
    const iteration = {
      version: newVersion,
      timestamp: new Date(),
      state: newState,
      changes: changes,
      contributors: [agentId]
    };

    design.iterations.push(iteration);
    design.currentState = newState;
    design.currentVersion = newVersion;

    // Record in evolution history
    this.recordEvolution(designId, {
      type: 'modification',
      agentId: agentId,
      changes: changes,
      version: newVersion
    });

    logger.info(`Applied modification to design ${designId} by agent ${agentId}`);

    return {
      designId,
      version: newVersion,
      changes: changes,
      currentState: newState
    };
  }

  async evolveDesignWithConsensus(designId, proposedChanges, participantAgentIds) {
    const design = this.designs.get(designId);
    if (!design) {
      throw new Error(`Design ${designId} not found`);
    }

    // Initiate consensus for proposed changes
    const proposal = {
      type: 'design-evolution',
      designId: designId,
      currentState: design.currentState,
      proposedChanges: proposedChanges,
      timestamp: new Date()
    };

    const consensus = await this.consensusService.initiateConsensus(
      designId,
      proposal,
      participantAgentIds
    );

    // Get each agent's analysis and vote
    const votes = [];
    for (const agentId of participantAgentIds) {
      const analysis = await this.llmService.analyzeDesign(agentId, {
        id: designId,
        ...design.currentState,
        proposedChanges: proposedChanges
      });

      // Determine vote based on analysis
      const vote = {
        decision: analysis.overallRating > 0.6 ? 'approve' : 
                  analysis.overallRating > 0.4 ? 'abstain' : 'reject',
        reasoning: analysis.suggestions.join('; '),
        confidence: analysis.overallRating
      };

      votes.push({
        agentId,
        vote,
        analysis
      });

      await this.consensusService.submitVote(consensus.consensusId, agentId, vote);
    }

    // Get consensus result
    const consensusResult = await this.consensusService.getConsensusStatus(consensus.consensusId);

    // Apply changes if consensus passed
    if (consensusResult.currentResults.approve > consensusResult.currentResults.reject) {
      const modificationResult = await this.applyModification(
        designId,
        'consensus',
        proposedChanges
      );

      this.recordEvolution(designId, {
        type: 'consensus-evolution',
        consensusId: consensus.consensusId,
        result: consensusResult,
        changes: modificationResult.changes,
        votes: votes
      });

      return {
        success: true,
        consensusId: consensus.consensusId,
        designId: designId,
        newVersion: modificationResult.version,
        changes: modificationResult.changes,
        consensusResult: consensusResult
      };
    }

    return {
      success: false,
      consensusId: consensus.consensusId,
      designId: designId,
      consensusResult: consensusResult,
      reason: 'Consensus rejected the proposed changes'
    };
  }

  async runIterativeEvolution(designId, participantAgentIds, rounds = 5) {
    const session = {
      id: `evolution-session-${uuidv4()}`,
      designId: designId,
      startTime: new Date(),
      rounds: [],
      participantAgentIds: participantAgentIds
    };

    for (let round = 0; round < rounds; round++) {
      logger.info(`Starting evolution round ${round + 1} for design ${designId}`);

      const roundData = {
        roundNumber: round + 1,
        proposals: [],
        consensusResults: [],
        appliedChanges: []
      };

      // Each agent proposes modifications
      for (const agentId of participantAgentIds) {
        const agent = this.llmService.getAgent(agentId);
        const currentState = await this.getDesignState(designId);

        // Generate proposal based on agent's personality
        const proposal = await this.generateAgentProposal(agent, currentState);
        roundData.proposals.push({
          agentId: agentId,
          agentName: agent.name,
          proposal: proposal
        });

        // Submit for consensus
        const evolutionResult = await this.evolveDesignWithConsensus(
          designId,
          proposal,
          participantAgentIds
        );

        roundData.consensusResults.push(evolutionResult);

        if (evolutionResult.success) {
          roundData.appliedChanges.push({
            agentId: agentId,
            changes: evolutionResult.changes
          });
        }
      }

      session.rounds.push(roundData);

      // Check if design has stabilized
      if (roundData.appliedChanges.length === 0) {
        logger.info(`Design ${designId} has stabilized after ${round + 1} rounds`);
        break;
      }
    }

    session.endTime = new Date();
    session.finalDesign = await this.getDesignState(designId);

    return session;
  }

  async generateAgentProposal(agent, currentState) {
    const proposal = {};

    // Generate proposals based on agent personality
    switch (agent.personality) {
      case 'minimalist':
        if (currentState.features.length > 3) {
          proposal.features = currentState.features.slice(0, 3);
        }
        if (!agent.traits.preferredColors.includes(currentState.bodyColor)) {
          proposal.bodyColor = agent.traits.preferredColors[0];
        }
        if (currentState.pocketCount > 2) {
          proposal.pocketCount = 2;
          proposal.pocketStyle = 'hidden';
        }
        break;

      case 'futuristic':
        if (!currentState.features.includes('smart-sensors')) {
          proposal.features = [...currentState.features, 'smart-sensors'];
        }
        if (!currentState.features.includes('led-strips')) {
          proposal.features = [...(proposal.features || currentState.features), 'led-strips'];
        }
        if (!currentState.materials.includes('nano-fabric')) {
          proposal.materials = [...currentState.materials, 'nano-fabric'];
        }
        proposal.bodyColor = agent.traits.preferredColors[
          Math.floor(Math.random() * agent.traits.preferredColors.length)
        ];
        break;

      case 'fusion':
        if (!currentState.features.includes('convertible-design')) {
          proposal.features = [...currentState.features, 'convertible-design'];
        }
        if (currentState.collarType === 'stand') {
          proposal.collarType = 'convertible';
        }
        if (!currentState.materials.includes('bamboo-fiber')) {
          proposal.materials = [...currentState.materials, 'bamboo-fiber'];
        }
        break;
    }

    return proposal;
  }

  recordEvolution(designId, event) {
    if (!this.evolutionHistory.has(designId)) {
      this.evolutionHistory.set(designId, []);
    }
    
    const history = this.evolutionHistory.get(designId);
    history.push({
      timestamp: new Date(),
      ...event
    });
  }

  async getDesignHistory(designId) {
    const design = this.designs.get(designId);
    if (!design) {
      throw new Error(`Design ${designId} not found`);
    }

    return {
      designId: designId,
      created: design.created,
      currentVersion: design.currentVersion,
      iterations: design.iterations,
      evolutionHistory: this.evolutionHistory.get(designId) || []
    };
  }

  async compareIterations(designId, version1, version2) {
    const design = this.designs.get(designId);
    if (!design) {
      throw new Error(`Design ${designId} not found`);
    }

    const iteration1 = design.iterations.find(i => i.version === version1);
    const iteration2 = design.iterations.find(i => i.version === version2);

    if (!iteration1 || !iteration2) {
      throw new Error('One or both versions not found');
    }

    const differences = [];
    const state1 = iteration1.state;
    const state2 = iteration2.state;

    Object.keys(state1).forEach(key => {
      if (JSON.stringify(state1[key]) !== JSON.stringify(state2[key])) {
        differences.push({
          property: key,
          version1Value: state1[key],
          version2Value: state2[key]
        });
      }
    });

    return {
      designId,
      version1,
      version2,
      differences,
      totalChanges: differences.length
    };
  }

  async exportDesign(designId, format = 'json') {
    const design = this.designs.get(designId);
    if (!design) {
      throw new Error(`Design ${designId} not found`);
    }

    switch (format) {
      case 'json':
        return {
          metadata: design.metadata,
          currentState: design.currentState,
          version: design.currentVersion,
          exported: new Date()
        };

      case 'full':
        return {
          ...design,
          evolutionHistory: this.evolutionHistory.get(designId) || []
        };

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
}

module.exports = { DesignEvolutionService };