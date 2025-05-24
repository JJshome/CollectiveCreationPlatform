const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
});

class ConsensusService {
  constructor(redisClient) {
    this.redis = redisClient;
    this.activeConsensuses = new Map();
    this.consensusHistory = [];
  }

  async initiateConsensus(designId, proposal, participantAgentIds) {
    const consensusId = `consensus-${uuidv4()}`;
    
    const consensus = {
      id: consensusId,
      designId: designId,
      proposal: proposal,
      participants: participantAgentIds,
      votes: new Map(),
      status: 'active',
      startTime: new Date(),
      endTime: null,
      result: null,
      threshold: 0.66, // 66% agreement required
      votingPower: this.calculateVotingPower(participantAgentIds)
    };

    this.activeConsensuses.set(consensusId, consensus);
    
    // Store in Redis for distributed access
    await this.redis.setEx(
      consensusId,
      3600, // 1 hour TTL
      JSON.stringify({
        ...consensus,
        votes: Array.from(consensus.votes.entries()),
        votingPower: Array.from(consensus.votingPower.entries())
      })
    );

    logger.info(`Initiated consensus ${consensusId} for design ${designId}`);
    
    return {
      consensusId,
      proposal,
      participants: participantAgentIds,
      status: 'active'
    };
  }

  calculateVotingPower(agentIds) {
    const votingPower = new Map();
    
    // In a real system, this would be based on agent reputation, expertise, etc.
    agentIds.forEach(agentId => {
      let power = 1.0;
      
      // Adjust voting power based on agent type
      if (agentId.includes('minimalist')) power = 1.1;
      if (agentId.includes('futuristic')) power = 1.2;
      if (agentId.includes('fusion')) power = 1.0;
      
      votingPower.set(agentId, power);
    });

    return votingPower;
  }

  async submitVote(consensusId, agentId, vote) {
    const consensus = this.activeConsensuses.get(consensusId);
    
    if (!consensus) {
      // Try to load from Redis
      const redisData = await this.redis.get(consensusId);
      if (!redisData) {
        throw new Error(`Consensus ${consensusId} not found`);
      }
      
      const parsedData = JSON.parse(redisData);
      consensus.votes = new Map(parsedData.votes);
      consensus.votingPower = new Map(parsedData.votingPower);
      this.activeConsensuses.set(consensusId, consensus);
    }

    if (consensus.status !== 'active') {
      throw new Error(`Consensus ${consensusId} is not active`);
    }

    if (!consensus.participants.includes(agentId)) {
      throw new Error(`Agent ${agentId} is not a participant in this consensus`);
    }

    // Record vote
    consensus.votes.set(agentId, {
      vote: vote, // 'approve', 'reject', 'abstain'
      timestamp: new Date(),
      weight: consensus.votingPower.get(agentId) || 1.0,
      reasoning: vote.reasoning || null
    });

    // Update Redis
    await this.updateConsensusInRedis(consensus);

    // Check if all votes are in
    if (consensus.votes.size === consensus.participants.length) {
      return await this.concludeConsensus(consensusId);
    }

    return {
      consensusId,
      agentId,
      vote: vote.decision,
      votesReceived: consensus.votes.size,
      votesRequired: consensus.participants.length
    };
  }

  async concludeConsensus(consensusId) {
    const consensus = this.activeConsensuses.get(consensusId);
    
    if (!consensus) {
      throw new Error(`Consensus ${consensusId} not found`);
    }

    // Calculate weighted results
    let approveWeight = 0;
    let rejectWeight = 0;
    let abstainWeight = 0;
    let totalWeight = 0;

    consensus.votes.forEach((voteData, agentId) => {
      const weight = voteData.weight;
      totalWeight += weight;
      
      switch (voteData.vote.decision) {
        case 'approve':
          approveWeight += weight;
          break;
        case 'reject':
          rejectWeight += weight;
          break;
        case 'abstain':
          abstainWeight += weight;
          break;
      }
    });

    const approvalRatio = approveWeight / totalWeight;
    const passed = approvalRatio >= consensus.threshold;

    consensus.status = 'completed';
    consensus.endTime = new Date();
    consensus.result = {
      passed: passed,
      approvalRatio: approvalRatio,
      votes: {
        approve: approveWeight,
        reject: rejectWeight,
        abstain: abstainWeight
      },
      breakdown: Array.from(consensus.votes.entries()).map(([agentId, voteData]) => ({
        agentId,
        decision: voteData.vote.decision,
        weight: voteData.weight,
        reasoning: voteData.reasoning
      }))
    };

    // Store in history
    this.consensusHistory.push(consensus);

    // Update Redis
    await this.updateConsensusInRedis(consensus);

    // Clean up active consensus
    this.activeConsensuses.delete(consensusId);

    logger.info(`Consensus ${consensusId} concluded: ${passed ? 'PASSED' : 'REJECTED'}`);

    return consensus.result;
  }

  async updateConsensusInRedis(consensus) {
    await this.redis.setEx(
      consensus.id,
      3600,
      JSON.stringify({
        ...consensus,
        votes: Array.from(consensus.votes.entries()),
        votingPower: Array.from(consensus.votingPower.entries())
      })
    );
  }

  async getConsensusStatus(consensusId) {
    let consensus = this.activeConsensuses.get(consensusId);
    
    if (!consensus) {
      const redisData = await this.redis.get(consensusId);
      if (!redisData) {
        throw new Error(`Consensus ${consensusId} not found`);
      }
      
      consensus = JSON.parse(redisData);
      consensus.votes = new Map(consensus.votes);
      consensus.votingPower = new Map(consensus.votingPower);
    }

    return {
      id: consensus.id,
      designId: consensus.designId,
      proposal: consensus.proposal,
      status: consensus.status,
      votesReceived: consensus.votes.size,
      votesRequired: consensus.participants.length,
      currentResults: this.calculateCurrentResults(consensus),
      startTime: consensus.startTime,
      endTime: consensus.endTime
    };
  }

  calculateCurrentResults(consensus) {
    let approveCount = 0;
    let rejectCount = 0;
    let abstainCount = 0;

    consensus.votes.forEach((voteData) => {
      switch (voteData.vote.decision) {
        case 'approve':
          approveCount++;
          break;
        case 'reject':
          rejectCount++;
          break;
        case 'abstain':
          abstainCount++;
          break;
      }
    });

    return {
      approve: approveCount,
      reject: rejectCount,
      abstain: abstainCount,
      pending: consensus.participants.length - consensus.votes.size
    };
  }

  async getConsensusHistory(designId = null) {
    if (designId) {
      return this.consensusHistory.filter(c => c.designId === designId);
    }
    return this.consensusHistory;
  }

  // Advanced consensus mechanisms

  async multiRoundConsensus(designId, proposal, participantAgentIds, rounds = 3) {
    const sessionId = `multi-round-${uuidv4()}`;
    const session = {
      id: sessionId,
      designId: designId,
      rounds: [],
      finalResult: null
    };

    for (let round = 0; round < rounds; round++) {
      const roundProposal = {
        ...proposal,
        round: round + 1,
        previousResults: round > 0 ? session.rounds[round - 1].result : null
      };

      const consensusResult = await this.initiateConsensus(
        designId,
        roundProposal,
        participantAgentIds
      );

      // Simulate voting (in real system, agents would vote based on analysis)
      for (const agentId of participantAgentIds) {
        const vote = this.simulateAgentVote(agentId, roundProposal);
        await this.submitVote(consensusResult.consensusId, agentId, vote);
      }

      const roundResult = await this.getConsensusStatus(consensusResult.consensusId);
      session.rounds.push(roundResult);

      // Check if consensus is strong enough to end early
      if (roundResult.currentResults.approve / participantAgentIds.length > 0.8) {
        break;
      }
    }

    session.finalResult = this.aggregateMultiRoundResults(session.rounds);
    return session;
  }

  simulateAgentVote(agentId, proposal) {
    // Simplified voting logic - in production, this would use LLM analysis
    const decisions = ['approve', 'reject', 'abstain'];
    const weights = [0.6, 0.3, 0.1]; // Bias towards approval
    
    let decision = decisions[0];
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (random < cumulative) {
        decision = decisions[i];
        break;
      }
    }

    return {
      decision: decision,
      reasoning: `Agent ${agentId} evaluated the proposal based on design principles`,
      confidence: Math.random() * 0.3 + 0.7
    };
  }

  aggregateMultiRoundResults(rounds) {
    const totalApprove = rounds.reduce((sum, round) => 
      sum + round.currentResults.approve, 0
    );
    const totalReject = rounds.reduce((sum, round) => 
      sum + round.currentResults.reject, 0
    );
    const totalVotes = rounds.reduce((sum, round) => 
      sum + round.currentResults.approve + round.currentResults.reject + round.currentResults.abstain, 0
    );

    return {
      overallApprovalRate: totalApprove / totalVotes,
      passed: totalApprove / totalVotes > 0.5,
      rounds: rounds.length,
      consensus: totalApprove / totalVotes > 0.66 ? 'strong' : 'weak'
    };
  }

  // Delegated voting system
  async delegatedConsensus(designId, proposal, delegationMap) {
    // Allow agents to delegate their voting power to other agents
    const enhancedVotingPower = new Map();
    
    delegationMap.forEach((delegate, delegator) => {
      const currentPower = enhancedVotingPower.get(delegate) || 1.0;
      enhancedVotingPower.set(delegate, currentPower + 1.0);
    });

    // Create consensus with enhanced voting power
    const participantAgentIds = Array.from(new Set([
      ...delegationMap.keys(),
      ...delegationMap.values()
    ]));

    const consensus = await this.initiateConsensus(designId, proposal, participantAgentIds);
    
    // Override voting power with delegated power
    consensus.votingPower = enhancedVotingPower;
    await this.updateConsensusInRedis(consensus);

    return consensus;
  }
}

module.exports = { ConsensusService };