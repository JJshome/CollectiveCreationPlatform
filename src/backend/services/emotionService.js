/**
 * Emotion Recognition Service for Real-time Emotional and Contextual Awareness
 * Implements emotion and situation recognition as described in patent
 */

const winston = require('winston');
const EventEmitter = require('events');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'emotion.log' }),
        new winston.transports.Console()
    ]
});

class EmotionRecognitionService extends EventEmitter {
    constructor() {
        super();
        this.userEmotionStates = new Map(); // Current emotion states
        this.emotionHistory = new Map(); // Historical emotion data
        this.contextualFactors = new Map(); // Situational context
        this.emotionPatterns = new Map(); // User emotion patterns
        this.adaptiveResponses = new Map(); // Personalized response strategies
        
        // Emotion categories based on research
        this.emotionCategories = {
            basic: ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust'],
            complex: ['frustration', 'excitement', 'confusion', 'satisfaction', 'anxiety', 'confidence'],
            social: ['empathy', 'loneliness', 'belonging', 'rejection', 'collaboration', 'competition'],
            creative: ['inspiration', 'block', 'flow', 'curiosity', 'doubt', 'breakthrough']
        };

        // Context categories
        this.contextCategories = {
            temporal: ['morning', 'afternoon', 'evening', 'night', 'weekend', 'weekday'],
            activity: ['creating', 'reviewing', 'collaborating', 'learning', 'presenting', 'deciding'],
            social: ['alone', 'small_group', 'large_group', 'one_on_one', 'public', 'private'],
            environment: ['quiet', 'noisy', 'focused', 'distracted', 'comfortable', 'stressed']
        };

        this.initializeEmotionAnalysis();
    }

    /**
     * Initialize emotion analysis system
     */
    async initializeEmotionAnalysis() {
        try {
            // Initialize emotion detection models (mock for development)
            this.emotionModels = {
                textAnalysis: new TextEmotionAnalyzer(),
                voiceAnalysis: new VoiceEmotionAnalyzer(),
                behaviorAnalysis: new BehaviorEmotionAnalyzer(),
                contextAnalysis: new ContextAnalyzer()
            };

            logger.info('Emotion recognition service initialized');
            this.emit('initialized');

        } catch (error) {
            logger.error('Failed to initialize emotion recognition service', { 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Analyze user emotion from multiple inputs
     */
    async analyzeUserEmotion(userId, inputData) {
        try {
            const analysisResults = {};

            // Text-based emotion analysis
            if (inputData.text) {
                analysisResults.textEmotion = await this.emotionModels.textAnalysis
                    .analyze(inputData.text);
            }

            // Voice-based emotion analysis
            if (inputData.voice) {
                analysisResults.voiceEmotion = await this.emotionModels.voiceAnalysis
                    .analyze(inputData.voice);
            }

            // Behavior-based emotion analysis
            if (inputData.behavior) {
                analysisResults.behaviorEmotion = await this.emotionModels.behaviorAnalysis
                    .analyze(inputData.behavior);
            }

            // Context analysis
            const contextData = await this.analyzeContext(userId, inputData.context);
            analysisResults.context = contextData;

            // Combine results for comprehensive emotion state
            const emotionState = this.combineEmotionAnalysis(analysisResults);
            
            // Update user's emotion state
            this.updateUserEmotionState(userId, emotionState);

            // Generate adaptive response
            const adaptiveResponse = await this.generateAdaptiveResponse(userId, emotionState);

            logger.info('User emotion analyzed', {
                userId,
                primaryEmotion: emotionState.primary,
                intensity: emotionState.intensity,
                context: contextData.primary
            });

            return {
                emotionState,
                contextData,
                adaptiveResponse,
                timestamp: Date.now()
            };

        } catch (error) {
            logger.error('Failed to analyze user emotion', {
                userId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Analyze situational context
     */
    async analyzeContext(userId, contextInput = {}) {
        try {
            const contextFactors = {
                temporal: this.getTemporalContext(),
                activity: contextInput.activity || 'unknown',
                social: contextInput.social || 'unknown',
                environment: contextInput.environment || 'unknown',
                projectPhase: contextInput.projectPhase || 'unknown',
                collaborationState: contextInput.collaborationState || 'unknown'
            };

            // Analyze historical context patterns
            const userContext = this.contextualFactors.get(userId) || {};
            const contextHistory = userContext.history || [];
            
            // Determine primary context influence
            const primaryContext = this.determinePrimaryContext(contextFactors, contextHistory);

            // Update user's context
            this.updateUserContext(userId, {
                current: contextFactors,
                primary: primaryContext,
                history: [...contextHistory.slice(-49), contextFactors] // Keep last 50
            });

            return {
                current: contextFactors,
                primary: primaryContext,
                influence: this.calculateContextInfluence(contextFactors)
            };

        } catch (error) {
            logger.error('Failed to analyze context', { userId, error: error.message });
            throw error;
        }
    }

    /**
     * Combine multiple emotion analysis results
     */
    combineEmotionAnalysis(analysisResults) {
        const emotions = {};
        let totalWeight = 0;

        // Weight different analysis methods
        const weights = {
            textEmotion: 0.4,
            voiceEmotion: 0.3,
            behaviorEmotion: 0.2,
            context: 0.1
        };

        // Combine weighted emotions
        Object.entries(analysisResults).forEach(([method, result]) => {
            if (result && result.emotions && weights[method]) {
                const weight = weights[method];
                totalWeight += weight;

                Object.entries(result.emotions).forEach(([emotion, intensity]) => {
                    if (!emotions[emotion]) emotions[emotion] = 0;
                    emotions[emotion] += intensity * weight;
                });
            }
        });

        // Normalize emotions
        Object.keys(emotions).forEach(emotion => {
            emotions[emotion] /= totalWeight;
        });

        // Find primary emotion
        const primaryEmotion = Object.entries(emotions)
            .sort(([,a], [,b]) => b - a)[0];

        // Calculate overall intensity
        const overallIntensity = Object.values(emotions)
            .reduce((sum, intensity) => sum + intensity, 0) / Object.keys(emotions).length;

        return {
            emotions,
            primary: primaryEmotion ? primaryEmotion[0] : 'neutral',
            primaryIntensity: primaryEmotion ? primaryEmotion[1] : 0,
            intensity: overallIntensity,
            confidence: this.calculateConfidence(analysisResults),
            timestamp: Date.now()
        };
    }

    /**
     * Generate adaptive response based on emotion state
     */
    async generateAdaptiveResponse(userId, emotionState) {
        try {
            const userPatterns = this.emotionPatterns.get(userId);
            const contextData = this.contextualFactors.get(userId);
            
            // Base response strategies
            const responseStrategies = {
                // High energy, positive emotions
                joy: {
                    interaction: 'enthusiastic',
                    complexity: 'high',
                    pace: 'fast',
                    suggestions: ['explore_advanced_topics', 'collaborative_challenges']
                },
                excitement: {
                    interaction: 'encouraging',
                    complexity: 'high',
                    pace: 'moderate',
                    suggestions: ['creative_opportunities', 'innovation_tasks']
                },
                
                // Low energy, negative emotions
                sadness: {
                    interaction: 'supportive',
                    complexity: 'low',
                    pace: 'slow',
                    suggestions: ['simple_tasks', 'encouraging_content']
                },
                frustration: {
                    interaction: 'patient',
                    complexity: 'simplified',
                    pace: 'slow',
                    suggestions: ['break_down_tasks', 'alternative_approaches']
                },
                
                // Neutral/focused states
                concentration: {
                    interaction: 'minimal',
                    complexity: 'appropriate',
                    pace: 'steady',
                    suggestions: ['reduce_interruptions', 'flow_support']
                },
                confusion: {
                    interaction: 'clarifying',
                    complexity: 'simplified',
                    pace: 'slow',
                    suggestions: ['step_by_step_guidance', 'examples']
                }
            };

            const primaryEmotion = emotionState.primary;
            const baseStrategy = responseStrategies[primaryEmotion] || responseStrategies.concentration;
            
            // Personalize based on user patterns
            const personalizedStrategy = this.personalizeResponse(
                baseStrategy, 
                userPatterns, 
                contextData
            );

            // Generate specific recommendations
            const recommendations = await this.generateEmotionBasedRecommendations(
                userId, 
                emotionState, 
                personalizedStrategy
            );

            const adaptiveResponse = {
                strategy: personalizedStrategy,
                recommendations,
                adaptations: {
                    contentComplexity: this.adaptContentComplexity(emotionState),
                    interactionStyle: this.adaptInteractionStyle(emotionState),
                    pacingAdjustment: this.adaptPacing(emotionState),
                    supportLevel: this.adaptSupportLevel(emotionState)
                },
                timestamp: Date.now()
            };

            // Store adaptive response for learning
            this.storeAdaptiveResponse(userId, emotionState, adaptiveResponse);

            return adaptiveResponse;

        } catch (error) {
            logger.error('Failed to generate adaptive response', {
                userId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Generate emotion-based recommendations
     */
    async generateEmotionBasedRecommendations(userId, emotionState, strategy) {
        const recommendations = [];
        const primaryEmotion = emotionState.primary;
        const intensity = emotionState.intensity;

        // Content recommendations
        if (primaryEmotion === 'frustration' || primaryEmotion === 'confusion') {
            recommendations.push({
                type: 'content',
                action: 'simplify_interface',
                description: 'Reduce visual complexity and provide clearer guidance'
            });
            recommendations.push({
                type: 'assistance',
                action: 'offer_help',
                description: 'Proactively offer step-by-step assistance'
            });
        }

        if (primaryEmotion === 'joy' || primaryEmotion === 'excitement') {
            recommendations.push({
                type: 'opportunity',
                action: 'suggest_advanced_features',
                description: 'Introduce more sophisticated tools and options'
            });
            recommendations.push({
                type: 'collaboration',
                action: 'connect_enthusiastic_users',
                description: 'Connect with other highly engaged users'
            });
        }

        if (primaryEmotion === 'sadness' || intensity < 0.3) {
            recommendations.push({
                type: 'motivation',
                action: 'provide_encouragement',
                description: 'Show progress and positive feedback'
            });
            recommendations.push({
                type: 'content',
                action: 'reduce_cognitive_load',
                description: 'Present fewer options and simpler choices'
            });
        }

        // Context-specific recommendations
        const contextData = this.contextualFactors.get(userId);
        if (contextData && contextData.current) {
            if (contextData.current.activity === 'collaborating') {
                recommendations.push({
                    type: 'collaboration',
                    action: 'optimize_team_dynamics',
                    description: 'Adjust collaboration tools based on emotional state'
                });
            }

            if (contextData.current.temporal === 'evening' || contextData.current.temporal === 'night') {
                recommendations.push({
                    type: 'wellness',
                    action: 'suggest_break',
                    description: 'Recommend taking a break or ending session'
                });
            }
        }

        return recommendations;
    }

    /**
     * Update user emotion state and history
     */
    updateUserEmotionState(userId, emotionState) {
        // Update current state
        this.userEmotionStates.set(userId, emotionState);

        // Update history
        const history = this.emotionHistory.get(userId) || [];
        history.push(emotionState);
        
        // Keep only last 100 emotion states
        if (history.length > 100) {
            history.shift();
        }
        
        this.emotionHistory.set(userId, history);

        // Update emotion patterns
        this.updateEmotionPatterns(userId, emotionState);

        // Emit emotion update event
        this.emit('emotionUpdated', { userId, emotionState });
    }

    /**
     * Update user emotion patterns for learning
     */
    updateEmotionPatterns(userId, emotionState) {
        const patterns = this.emotionPatterns.get(userId) || {
            commonEmotions: {},
            triggers: {},
            responses: {},
            preferences: {}
        };

        // Track common emotions
        const primaryEmotion = emotionState.primary;
        patterns.commonEmotions[primaryEmotion] = 
            (patterns.commonEmotions[primaryEmotion] || 0) + 1;

        // Analyze temporal patterns
        const hour = new Date().getHours();
        const timeSlot = this.getTimeSlot(hour);
        if (!patterns.temporalPatterns) patterns.temporalPatterns = {};
        if (!patterns.temporalPatterns[timeSlot]) patterns.temporalPatterns[timeSlot] = {};
        patterns.temporalPatterns[timeSlot][primaryEmotion] = 
            (patterns.temporalPatterns[timeSlot][primaryEmotion] || 0) + 1;

        this.emotionPatterns.set(userId, patterns);
    }

    /**
     * Get current emotional state for a user
     */
    getCurrentEmotionState(userId) {
        return this.userEmotionStates.get(userId) || {
            emotions: { neutral: 1.0 },
            primary: 'neutral',
            primaryIntensity: 0.5,
            intensity: 0.5,
            confidence: 0.5,
            timestamp: Date.now()
        };
    }

    /**
     * Get emotion history for a user
     */
    getEmotionHistory(userId, limit = 50) {
        const history = this.emotionHistory.get(userId) || [];
        return history.slice(-limit);
    }

    /**
     * Get emotion analytics for a user
     */
    getEmotionAnalytics(userId) {
        const history = this.emotionHistory.get(userId) || [];
        const patterns = this.emotionPatterns.get(userId) || {};
        
        if (history.length === 0) {
            return {
                totalSessions: 0,
                averageIntensity: 0,
                commonEmotions: {},
                emotionTrends: [],
                recommendations: []
            };
        }

        // Calculate analytics
        const totalSessions = history.length;
        const averageIntensity = history.reduce((sum, state) => sum + state.intensity, 0) / totalSessions;
        
        // Find emotion trends
        const emotionTrends = this.calculateEmotionTrends(history);
        
        // Generate recommendations based on patterns
        const recommendations = this.generatePersonalizedRecommendations(patterns);

        return {
            totalSessions,
            averageIntensity,
            commonEmotions: patterns.commonEmotions || {},
            temporalPatterns: patterns.temporalPatterns || {},
            emotionTrends,
            recommendations
        };
    }

    /**
     * Utility methods
     */
    getTemporalContext() {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();
        
        let timeOfDay;
        if (hour >= 6 && hour < 12) timeOfDay = 'morning';
        else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
        else if (hour >= 18 && hour < 22) timeOfDay = 'evening';
        else timeOfDay = 'night';

        const dayType = (day === 0 || day === 6) ? 'weekend' : 'weekday';

        return { timeOfDay, dayType, hour, day };
    }

    getTimeSlot(hour) {
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        if (hour >= 18 && hour < 22) return 'evening';
        return 'night';
    }

    determinePrimaryContext(contextFactors, history) {
        // Simple implementation - can be enhanced with ML
        const weights = {
            temporal: 0.2,
            activity: 0.3,
            social: 0.2,
            environment: 0.2,
            projectPhase: 0.1
        };

        let maxWeight = 0;
        let primaryContext = 'unknown';

        Object.entries(contextFactors).forEach(([category, value]) => {
            if (weights[category] && weights[category] > maxWeight) {
                maxWeight = weights[category];
                primaryContext = `${category}:${value}`;
            }
        });

        return primaryContext;
    }

    calculateContextInfluence(contextFactors) {
        // Calculate how much context might influence emotions
        let influence = 0.5; // Base influence

        // Adjust based on specific factors
        if (contextFactors.environment === 'stressed') influence += 0.2;
        if (contextFactors.social === 'large_group') influence += 0.1;
        if (contextFactors.activity === 'presenting') influence += 0.15;

        return Math.min(influence, 1.0);
    }

    calculateConfidence(analysisResults) {
        const methods = Object.keys(analysisResults).length;
        const baseConfidence = Math.min(methods * 0.2, 0.8);
        
        // Adjust based on consistency across methods
        // Implementation simplified for demo
        return baseConfidence;
    }

    personalizeResponse(baseStrategy, userPatterns, contextData) {
        const personalizedStrategy = { ...baseStrategy };

        // Adjust based on user patterns
        if (userPatterns && userPatterns.preferences) {
            if (userPatterns.preferences.fastPace) {
                personalizedStrategy.pace = 'fast';
            }
            if (userPatterns.preferences.detailedExplanations) {
                personalizedStrategy.complexity = 'high';
            }
        }

        // Adjust based on context
        if (contextData && contextData.current) {
            if (contextData.current.environment === 'noisy') {
                personalizedStrategy.interaction = 'focused';
            }
        }

        return personalizedStrategy;
    }

    adaptContentComplexity(emotionState) {
        const intensity = emotionState.intensity;
        const primaryEmotion = emotionState.primary;

        if (primaryEmotion === 'confusion' || intensity < 0.3) {
            return 'simplified';
        } else if (primaryEmotion === 'joy' || primaryEmotion === 'excitement') {
            return 'enhanced';
        }
        return 'standard';
    }

    adaptInteractionStyle(emotionState) {
        const primaryEmotion = emotionState.primary;
        
        const styleMap = {
            'sadness': 'supportive',
            'frustration': 'patient',
            'joy': 'enthusiastic',
            'anxiety': 'calming',
            'confusion': 'clarifying',
            'excitement': 'encouraging'
        };

        return styleMap[primaryEmotion] || 'neutral';
    }

    adaptPacing(emotionState) {
        const intensity = emotionState.intensity;
        const primaryEmotion = emotionState.primary;

        if (['sadness', 'frustration', 'confusion'].includes(primaryEmotion)) {
            return 'slower';
        } else if (['joy', 'excitement'].includes(primaryEmotion) && intensity > 0.7) {
            return 'faster';
        }
        return 'normal';
    }

    adaptSupportLevel(emotionState) {
        const primaryEmotion = emotionState.primary;
        const intensity = emotionState.intensity;

        if (['sadness', 'frustration', 'anxiety'].includes(primaryEmotion) || intensity < 0.4) {
            return 'high';
        } else if (['joy', 'confidence'].includes(primaryEmotion) && intensity > 0.7) {
            return 'minimal';
        }
        return 'moderate';
    }

    storeAdaptiveResponse(userId, emotionState, adaptiveResponse) {
        const responses = this.adaptiveResponses.get(userId) || [];
        responses.push({
            emotionState,
            adaptiveResponse,
            timestamp: Date.now()
        });
        
        // Keep only last 50 responses
        if (responses.length > 50) {
            responses.shift();
        }
        
        this.adaptiveResponses.set(userId, responses);
    }

    updateUserContext(userId, contextData) {
        this.contextualFactors.set(userId, contextData);
    }

    calculateEmotionTrends(history) {
        // Simple trend calculation - can be enhanced
        const trends = [];
        const windowSize = 10;

        for (let i = windowSize; i < history.length; i++) {
            const recent = history.slice(i - windowSize, i);
            const avgIntensity = recent.reduce((sum, state) => sum + state.intensity, 0) / windowSize;
            
            trends.push({
                timestamp: history[i].timestamp,
                averageIntensity: avgIntensity,
                primaryEmotion: history[i].primary
            });
        }

        return trends;
    }

    generatePersonalizedRecommendations(patterns) {
        const recommendations = [];

        // Based on common emotions
        if (patterns.commonEmotions) {
            const topEmotion = Object.entries(patterns.commonEmotions)
                .sort(([,a], [,b]) => b - a)[0];
            
            if (topEmotion && topEmotion[0] === 'frustration') {
                recommendations.push({
                    type: 'improvement',
                    message: 'Consider taking breaks when feeling frustrated to improve productivity'
                });
            }
        }

        return recommendations;
    }
}

/**
 * Mock emotion analysis classes for development
 */
class TextEmotionAnalyzer {
    async analyze(text) {
        // Mock implementation - replace with actual NLP models
        const emotions = {};
        const words = text.toLowerCase().split(' ');
        
        // Simple keyword-based emotion detection
        const emotionKeywords = {
            joy: ['happy', 'great', 'excellent', 'wonderful', 'amazing', 'love'],
            sadness: ['sad', 'disappointed', 'unhappy', 'terrible', 'awful'],
            anger: ['angry', 'frustrated', 'annoyed', 'mad', 'furious'],
            fear: ['worried', 'scared', 'anxious', 'nervous', 'afraid'],
            surprise: ['surprised', 'shocked', 'unexpected', 'wow'],
            confusion: ['confused', 'unclear', 'don\'t understand', 'help']
        };

        Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
            const matches = words.filter(word => keywords.includes(word)).length;
            if (matches > 0) {
                emotions[emotion] = Math.min(matches * 0.3, 1.0);
            }
        });

        // Default to neutral if no emotions detected
        if (Object.keys(emotions).length === 0) {
            emotions.neutral = 0.7;
        }

        return {
            emotions,
            confidence: 0.6,
            method: 'text_analysis'
        };
    }
}

class VoiceEmotionAnalyzer {
    async analyze(voiceData) {
        // Mock implementation - replace with actual voice analysis
        return {
            emotions: {
                neutral: 0.6,
                slight_stress: 0.3
            },
            confidence: 0.4,
            method: 'voice_analysis'
        };
    }
}

class BehaviorEmotionAnalyzer {
    async analyze(behaviorData) {
        // Mock implementation - replace with actual behavior analysis
        const emotions = {};
        
        if (behaviorData.clickRate && behaviorData.clickRate > 10) {
            emotions.excitement = 0.4;
        }
        if (behaviorData.pauseDuration && behaviorData.pauseDuration > 5000) {
            emotions.confusion = 0.5;
        }
        
        if (Object.keys(emotions).length === 0) {
            emotions.neutral = 0.7;
        }

        return {
            emotions,
            confidence: 0.5,
            method: 'behavior_analysis'
        };
    }
}

class ContextAnalyzer {
    async analyze(contextData) {
        // Mock implementation
        return {
            primary: contextData.activity || 'unknown',
            factors: contextData,
            influence: 0.3
        };
    }
}

module.exports = EmotionRecognitionService;