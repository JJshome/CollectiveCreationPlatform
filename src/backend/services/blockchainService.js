/**
 * Blockchain Service for NFT Rewards and Virtual Asset Management
 * Implements blockchain-based virtual economy system as described in patent
 */

const { ethers } = require('ethers');
const crypto = require('crypto');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'blockchain.log' }),
        new winston.transports.Console()
    ]
});

class BlockchainService {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.nftContract = null;
        this.rewardTokenContract = null;
        this.transactions = new Map(); // Transaction history
        this.nftAssets = new Map(); // NFT asset registry
        this.userWallets = new Map(); // User wallet addresses
        this.rewardPool = new Map(); // Reward distribution pool
        
        this.initializeBlockchain();
    }

    /**
     * Initialize blockchain connection and contracts
     */
    async initializeBlockchain() {
        try {
            // For development, use local Ganache or testnet
            const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8545';
            this.provider = new ethers.JsonRpcProvider(rpcUrl);
            
            // Initialize wallet with private key
            const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY || this.generatePrivateKey();
            this.wallet = new ethers.Wallet(privateKey, this.provider);
            
            logger.info('Blockchain service initialized', {
                network: await this.provider.getNetwork(),
                address: this.wallet.address
            });
            
            // Initialize smart contracts (mock for development)
            await this.initializeMockContracts();
            
        } catch (error) {
            logger.error('Failed to initialize blockchain service', { error: error.message });
            // Fallback to mock mode for development
            this.initializeMockMode();
        }
    }

    /**
     * Initialize mock contracts for development
     */
    async initializeMockContracts() {
        // Mock NFT contract implementation
        this.nftContract = {
            mintNFT: async (to, tokenId, metadata) => {
                return this.mockMintNFT(to, tokenId, metadata);
            },
            transferNFT: async (from, to, tokenId) => {
                return this.mockTransferNFT(from, to, tokenId);
            },
            getNFTMetadata: async (tokenId) => {
                return this.mockGetNFTMetadata(tokenId);
            }
        };

        // Mock reward token contract
        this.rewardTokenContract = {
            mint: async (to, amount) => {
                return this.mockMintRewardToken(to, amount);
            },
            transfer: async (from, to, amount) => {
                return this.mockTransferRewardToken(from, to, amount);
            },
            balanceOf: async (address) => {
                return this.mockGetTokenBalance(address);
            }
        };

        logger.info('Mock blockchain contracts initialized');
    }

    /**
     * Initialize mock mode for development without blockchain
     */
    initializeMockMode() {
        this.mockMode = true;
        logger.info('Blockchain service running in mock mode');
    }

    /**
     * Generate private key for development
     */
    generatePrivateKey() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Create user wallet
     */
    async createUserWallet(userId) {
        try {
            const wallet = ethers.Wallet.createRandom();
            const walletData = {
                address: wallet.address,
                privateKey: wallet.privateKey, // In production, encrypt this
                balance: 0,
                nftAssets: [],
                rewardTokens: 0,
                createdAt: new Date()
            };
            
            this.userWallets.set(userId, walletData);
            
            logger.info('User wallet created', { 
                userId, 
                address: wallet.address 
            });
            
            return walletData;
        } catch (error) {
            logger.error('Failed to create user wallet', { userId, error: error.message });
            throw error;
        }
    }

    /**
     * Mint NFT for collaboration reward
     */
    async mintCollaborationNFT(userId, projectId, contributionData) {
        try {
            const userWallet = this.userWallets.get(userId);
            if (!userWallet) {
                throw new Error('User wallet not found');
            }

            const tokenId = this.generateTokenId();
            const metadata = {
                name: `Collaboration NFT - ${projectId}`,
                description: `Awarded for contribution to project ${projectId}`,
                project: projectId,
                contributor: userId,
                contribution: contributionData,
                timestamp: Date.now(),
                rarity: this.calculateRarity(contributionData),
                attributes: this.generateNFTAttributes(contributionData)
            };

            // Mint NFT
            const transaction = await this.nftContract.mintNFT(
                userWallet.address,
                tokenId,
                metadata
            );

            // Update user's NFT collection
            userWallet.nftAssets.push({
                tokenId,
                metadata,
                transactionHash: transaction.hash,
                mintedAt: new Date()
            });

            // Record transaction
            this.recordTransaction({
                type: 'NFT_MINT',
                userId,
                tokenId,
                projectId,
                transaction: transaction.hash,
                timestamp: Date.now()
            });

            logger.info('Collaboration NFT minted', {
                userId,
                projectId,
                tokenId,
                transaction: transaction.hash
            });

            return {
                tokenId,
                metadata,
                transaction: transaction.hash
            };

        } catch (error) {
            logger.error('Failed to mint collaboration NFT', {
                userId,
                projectId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Distribute reward tokens for project participation
     */
    async distributeRewardTokens(participants, totalReward, projectId) {
        try {
            const distributions = [];
            
            for (const participant of participants) {
                const { userId, contributionScore } = participant;
                const userWallet = this.userWallets.get(userId);
                
                if (!userWallet) {
                    logger.warn('User wallet not found for reward distribution', { userId });
                    continue;
                }

                // Calculate reward based on contribution score
                const rewardAmount = Math.floor((contributionScore / 100) * totalReward);
                
                if (rewardAmount > 0) {
                    // Mint reward tokens
                    const transaction = await this.rewardTokenContract.mint(
                        userWallet.address,
                        rewardAmount
                    );

                    // Update user's token balance
                    userWallet.rewardTokens += rewardAmount;

                    distributions.push({
                        userId,
                        address: userWallet.address,
                        amount: rewardAmount,
                        transaction: transaction.hash
                    });

                    // Record transaction
                    this.recordTransaction({
                        type: 'REWARD_DISTRIBUTION',
                        userId,
                        amount: rewardAmount,
                        projectId,
                        transaction: transaction.hash,
                        timestamp: Date.now()
                    });
                }
            }

            logger.info('Reward tokens distributed', {
                projectId,
                totalParticipants: participants.length,
                totalDistributed: distributions.reduce((sum, d) => sum + d.amount, 0)
            });

            return distributions;

        } catch (error) {
            logger.error('Failed to distribute reward tokens', {
                projectId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Create virtual marketplace listing
     */
    async createMarketplaceListing(userId, tokenId, price, currency = 'ETH') {
        try {
            const userWallet = this.userWallets.get(userId);
            if (!userWallet) {
                throw new Error('User wallet not found');
            }

            // Verify user owns the NFT
            const nftAsset = userWallet.nftAssets.find(asset => asset.tokenId === tokenId);
            if (!nftAsset) {
                throw new Error('NFT not found in user wallet');
            }

            const listingId = this.generateListingId();
            const listing = {
                listingId,
                tokenId,
                seller: userId,
                sellerAddress: userWallet.address,
                price,
                currency,
                status: 'active',
                createdAt: new Date(),
                metadata: nftAsset.metadata
            };

            // Store listing (in production, this would be on-chain)
            if (!this.marketplaceListings) {
                this.marketplaceListings = new Map();
            }
            this.marketplaceListings.set(listingId, listing);

            logger.info('Marketplace listing created', {
                userId,
                tokenId,
                listingId,
                price,
                currency
            });

            return listing;

        } catch (error) {
            logger.error('Failed to create marketplace listing', {
                userId,
                tokenId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Execute NFT purchase
     */
    async purchaseNFT(buyerId, listingId) {
        try {
            const buyerWallet = this.userWallets.get(buyerId);
            if (!buyerWallet) {
                throw new Error('Buyer wallet not found');
            }

            const listing = this.marketplaceListings.get(listingId);
            if (!listing || listing.status !== 'active') {
                throw new Error('Listing not found or inactive');
            }

            const sellerWallet = this.userWallets.get(listing.seller);
            if (!sellerWallet) {
                throw new Error('Seller wallet not found');
            }

            // Check buyer has sufficient balance (simplified)
            if (buyerWallet.rewardTokens < listing.price) {
                throw new Error('Insufficient balance');
            }

            // Execute transfer
            const transferTx = await this.nftContract.transferNFT(
                sellerWallet.address,
                buyerWallet.address,
                listing.tokenId
            );

            // Update wallets
            buyerWallet.rewardTokens -= listing.price;
            sellerWallet.rewardTokens += listing.price;

            // Transfer NFT
            const nftIndex = sellerWallet.nftAssets.findIndex(
                asset => asset.tokenId === listing.tokenId
            );
            if (nftIndex !== -1) {
                const nftAsset = sellerWallet.nftAssets.splice(nftIndex, 1)[0];
                buyerWallet.nftAssets.push(nftAsset);
            }

            // Update listing status
            listing.status = 'sold';
            listing.buyer = buyerId;
            listing.soldAt = new Date();

            // Record transaction
            this.recordTransaction({
                type: 'NFT_PURCHASE',
                buyerId,
                sellerId: listing.seller,
                tokenId: listing.tokenId,
                price: listing.price,
                transaction: transferTx.hash,
                timestamp: Date.now()
            });

            logger.info('NFT purchased successfully', {
                buyerId,
                sellerId: listing.seller,
                tokenId: listing.tokenId,
                price: listing.price
            });

            return {
                success: true,
                transaction: transferTx.hash,
                listing
            };

        } catch (error) {
            logger.error('Failed to purchase NFT', {
                buyerId,
                listingId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get user's virtual assets
     */
    async getUserAssets(userId) {
        try {
            const userWallet = this.userWallets.get(userId);
            if (!userWallet) {
                return {
                    address: null,
                    nftAssets: [],
                    rewardTokens: 0,
                    transactions: []
                };
            }

            const userTransactions = Array.from(this.transactions.values())
                .filter(tx => tx.userId === userId)
                .sort((a, b) => b.timestamp - a.timestamp);

            return {
                address: userWallet.address,
                nftAssets: userWallet.nftAssets,
                rewardTokens: userWallet.rewardTokens,
                transactions: userTransactions.slice(0, 50) // Last 50 transactions
            };

        } catch (error) {
            logger.error('Failed to get user assets', { userId, error: error.message });
            throw error;
        }
    }

    /**
     * Get marketplace listings
     */
    async getMarketplaceListings(filters = {}) {
        try {
            if (!this.marketplaceListings) {
                return [];
            }

            let listings = Array.from(this.marketplaceListings.values());

            // Apply filters
            if (filters.status) {
                listings = listings.filter(listing => listing.status === filters.status);
            }
            if (filters.priceMin) {
                listings = listings.filter(listing => listing.price >= filters.priceMin);
            }
            if (filters.priceMax) {
                listings = listings.filter(listing => listing.price <= filters.priceMax);
            }

            // Sort by creation date (newest first)
            listings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return listings;

        } catch (error) {
            logger.error('Failed to get marketplace listings', { error: error.message });
            throw error;
        }
    }

    /**
     * Mock implementations for development
     */
    async mockMintNFT(to, tokenId, metadata) {
        return {
            hash: `0x${crypto.randomBytes(32).toString('hex')}`,
            tokenId,
            to,
            metadata,
            timestamp: Date.now()
        };
    }

    async mockTransferNFT(from, to, tokenId) {
        return {
            hash: `0x${crypto.randomBytes(32).toString('hex')}`,
            from,
            to,
            tokenId,
            timestamp: Date.now()
        };
    }

    async mockGetNFTMetadata(tokenId) {
        const asset = Array.from(this.userWallets.values())
            .flatMap(wallet => wallet.nftAssets)
            .find(asset => asset.tokenId === tokenId);
        return asset ? asset.metadata : null;
    }

    async mockMintRewardToken(to, amount) {
        return {
            hash: `0x${crypto.randomBytes(32).toString('hex')}`,
            to,
            amount,
            timestamp: Date.now()
        };
    }

    async mockTransferRewardToken(from, to, amount) {
        return {
            hash: `0x${crypto.randomBytes(32).toString('hex')}`,
            from,
            to,
            amount,
            timestamp: Date.now()
        };
    }

    async mockGetTokenBalance(address) {
        const wallet = Array.from(this.userWallets.values())
            .find(w => w.address === address);
        return wallet ? wallet.rewardTokens : 0;
    }

    /**
     * Utility functions
     */
    generateTokenId() {
        return `NFT_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }

    generateListingId() {
        return `LISTING_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }

    calculateRarity(contributionData) {
        // Simple rarity calculation based on contribution score
        const score = contributionData.score || 0;
        if (score >= 90) return 'legendary';
        if (score >= 75) return 'epic';
        if (score >= 50) return 'rare';
        if (score >= 25) return 'uncommon';
        return 'common';
    }

    generateNFTAttributes(contributionData) {
        return [
            {
                trait_type: 'Contribution Score',
                value: contributionData.score || 0
            },
            {
                trait_type: 'Project Phase',
                value: contributionData.phase || 'unknown'
            },
            {
                trait_type: 'Collaboration Type',
                value: contributionData.type || 'general'
            },
            {
                trait_type: 'Innovation Level',
                value: contributionData.innovationLevel || 'standard'
            }
        ];
    }

    recordTransaction(transactionData) {
        const txId = `TX_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        this.transactions.set(txId, {
            id: txId,
            ...transactionData
        });
        
        // Keep only last 10000 transactions to prevent memory issues
        if (this.transactions.size > 10000) {
            const oldestTx = Array.from(this.transactions.keys())[0];
            this.transactions.delete(oldestTx);
        }
    }

    /**
     * Get blockchain analytics
     */
    async getBlockchainAnalytics() {
        try {
            const totalWallets = this.userWallets.size;
            const totalNFTs = Array.from(this.userWallets.values())
                .reduce((sum, wallet) => sum + wallet.nftAssets.length, 0);
            const totalRewardTokens = Array.from(this.userWallets.values())
                .reduce((sum, wallet) => sum + wallet.rewardTokens, 0);
            const totalTransactions = this.transactions.size;
            const activeListings = this.marketplaceListings ? 
                Array.from(this.marketplaceListings.values())
                    .filter(listing => listing.status === 'active').length : 0;

            return {
                totalWallets,
                totalNFTs,
                totalRewardTokens,
                totalTransactions,
                activeListings,
                lastUpdated: new Date()
            };

        } catch (error) {
            logger.error('Failed to get blockchain analytics', { error: error.message });
            throw error;
        }
    }
}

module.exports = BlockchainService;