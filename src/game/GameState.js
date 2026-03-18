/**
 * GameState Manager
 * Handles all game progression, save/load, and player stats
 */

import { SAVE_KEY } from '../constants.js';


export class GameState {
    constructor() {
        this.data = {
            playerName: 'Player',
            characterType: null, // Selected character class (e.g. 'scholar', 'healer', 'knight', 'explorer')
            characterContext: '', // Free-text backstory or learning context
            sessionId: null,
            anonymousToken: null, // Persistent cross-session token
            defeatedGuests: [],
            wrongAnswers: {}, // { npcId: [questionIndex, ...] } for NPC memory
            overworld: {
                npcPositions: {}
            },
            battleStats: {
                totalBattles: 0,
                wins: 0,
                losses: 0,
                perfectBattles: 0,
                totalQuestionsAnswered: 0,
                correctAnswers: 0
            },
            currentScore: 0,
            achievements: [],
            streakDays: 0,
            lastPlayedDate: null, // YYYY-MM-DD for streak tracking
            lastPlayed: Date.now(),
            version: '0.6'
        };
    }

    /**
     * Initialize game state - load from storage or create new
     */
    init() {
        this.load();
    }

    /**
     * Load game data from LocalStorage
     */
    load() {
        try {
            const savedData = localStorage.getItem(SAVE_KEY);
            if (savedData) {
                const parsed = JSON.parse(savedData);
                // Merge saved data with defaults (in case new fields were added)
                this.data = { ...this.data, ...parsed };
                console.log('Game loaded:', this.data);
                return true;
            }
        } catch (error) {
            console.error('Failed to load game:', error);
        }
        return false;
    }

    /**
     * Save game data to LocalStorage
     */
    save() {
        try {
            this.data.lastPlayed = Date.now();
            this.updateStreak();
            localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
            return true;
        } catch (error) {
            console.error('Failed to save game:', error);
            return false;
        }
    }

    /**
     * Check if save data exists
     */
    hasSaveData() {
        return localStorage.getItem(SAVE_KEY) !== null;
    }

    /**
     * Reset all progress
     */
    reset() {
        const token = this.data.anonymousToken; // Preserve identity
        localStorage.removeItem(SAVE_KEY);
        this.data = {
            playerName: 'Player',
            characterType: null,
            characterContext: '',
            sessionId: null,
            anonymousToken: token,
            defeatedGuests: [],
            wrongAnswers: {},
            overworld: {
                npcPositions: {}
            },
            battleStats: {
                totalBattles: 0,
                wins: 0,
                losses: 0,
                perfectBattles: 0,
                totalQuestionsAnswered: 0,
                correctAnswers: 0
            },
            currentScore: 0,
            achievements: [],
            streakDays: 0,
            lastPlayedDate: null,
            lastPlayed: Date.now(),
            version: '0.6'
        };
        console.log('Game reset');
    }

    /**
     * Set player name
     */
    setPlayerName(name) {
        this.data.playerName = name || 'Player';
        this.save();
    }

    /**
     * Set character type
     */
    setCharacterType(type) {
        this.data.characterType = type || null;
        this.save();
    }

    /**
     * Get character type
     */
    getCharacterType() {
        return this.data.characterType;
    }

    /**
     * Set character context / backstory
     */
    setCharacterContext(context) {
        this.data.characterContext = (context || '').substring(0, 200);
        this.save();
    }

    /**
     * Get character context / backstory
     */
    getCharacterContext() {
        return this.data.characterContext || '';
    }

    /**
     * Generate a new session ID for the current game run
     */
    generateNewSessionId() {
        this.data.sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        console.log('New session started:', this.data.sessionId);
        return this.data.sessionId;
    }

    /**
     * Get current session ID
     */
    getSessionId() {
        return this.data.sessionId;
    }

    /**
     * Check if a guest has been defeated
     */
    isGuestDefeated(guestId) {
        return this.data.defeatedGuests.includes(guestId);
    }

    /**
     * Mark a guest as defeated
     */
    defeatGuest(guestId) {
        if (!this.isGuestDefeated(guestId)) {
            this.data.defeatedGuests.push(guestId);
            this.save();
        }
    }

    /**
     * Record battle result
     */
    recordBattle(result) {
        this.data.battleStats.totalBattles++;

        if (result.won) {
            this.data.battleStats.wins++;
            this.defeatGuest(result.guestId);

            // Check for perfect battle
            if (result.wrongAnswers === 0) {
                this.data.battleStats.perfectBattles++;
            }

            // Add XP (fallback to score for older callers)
            const xpGained = result.xpGained ?? result.score ?? 0;
            this.data.currentScore += xpGained;
        } else {
            this.data.battleStats.losses++;
        }

        // Update question stats
        this.data.battleStats.totalQuestionsAnswered += result.totalQuestions;
        this.data.battleStats.correctAnswers += result.correctAnswers;

        this.save();
    }

    /**
     * Get current stats
     */
    getStats() {
        return {
            ...this.data.battleStats,
            defeatedCount: this.data.defeatedGuests.length,
            accuracy: this.data.battleStats.totalQuestionsAnswered > 0
                ? (this.data.battleStats.correctAnswers / this.data.battleStats.totalQuestionsAnswered * 100).toFixed(1)
                : 0,
            score: this.data.currentScore
        };
    }

    /**
     * Get player name
     */
    getPlayerName() {
        return this.data.playerName;
    }

    /**
     * Get defeated guests list
     */
    getDefeatedGuests() {
        return [...this.data.defeatedGuests];
    }

    getNPCPositions(levelKey) {
        return this.data.overworld?.npcPositions?.[levelKey] || [];
    }

    setNPCPositions(levelKey, positions) {
        if (!this.data.overworld) {
            this.data.overworld = { npcPositions: {} };
        }
        if (!this.data.overworld.npcPositions) {
            this.data.overworld.npcPositions = {};
        }
        this.data.overworld.npcPositions[levelKey] = positions;
        this.save();
    }

    removeNPCPosition(levelKey, guestId) {
        if (!this.data.overworld?.npcPositions?.[levelKey]) return;
        this.data.overworld.npcPositions[levelKey] = this.data.overworld.npcPositions[levelKey]
            .filter(entry => entry.guestId !== guestId);
        this.save();
    }

    clearNPCPositions() {
        if (!this.data.overworld) {
            this.data.overworld = { npcPositions: {} };
        }
        this.data.overworld.npcPositions = {};
        this.save();
    }

    /**
     * Get or create anonymous token for persistent identity
     */
    getAnonymousToken() {
        if (!this.data.anonymousToken) {
            this.data.anonymousToken = crypto.randomUUID ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
            this.save();
        }
        return this.data.anonymousToken;
    }

    /**
     * Update streak tracking
     */
    updateStreak() {
        const today = new Date().toISOString().split('T')[0];
        const lastDate = this.data.lastPlayedDate;

        if (!lastDate) {
            this.data.streakDays = 1;
        } else if (lastDate === today) {
            // Same day, no change
        } else {
            const last = new Date(lastDate);
            const now = new Date(today);
            const diffMs = now - last;
            const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                this.data.streakDays = (this.data.streakDays || 0) + 1;
            } else {
                this.data.streakDays = 1; // Reset streak
            }
        }

        this.data.lastPlayedDate = today;
    }

    /**
     * Get current streak
     */
    getStreak() {
        return this.data.streakDays || 0;
    }

    /**
     * Record wrong answers for NPC memory
     */
    recordWrongAnswers(npcId, wrongQuestionIndices) {
        if (!this.data.wrongAnswers) this.data.wrongAnswers = {};
        if (!this.data.wrongAnswers[npcId]) this.data.wrongAnswers[npcId] = [];
        // Merge, deduplicate
        const existing = new Set(this.data.wrongAnswers[npcId]);
        wrongQuestionIndices.forEach(i => existing.add(i));
        this.data.wrongAnswers[npcId] = [...existing];
        this.save();
    }

    /**
     * Get wrong answer indices for an NPC
     */
    getWrongAnswers(npcId) {
        return this.data.wrongAnswers?.[npcId] || [];
    }

    /**
     * Check if player has visited an NPC before
     */
    hasVisitedNPC(npcId) {
        return this.data.defeatedGuests.includes(npcId) ||
            (this.data.wrongAnswers?.[npcId]?.length > 0);
    }

    /**
     * Check and unlock achievements
     */
    checkAchievements() {
        const achievements = [];

        // First Victory
        if (this.data.battleStats.wins === 1 && !this.data.achievements.includes('first_victory')) {
            achievements.push('first_victory');
        }

        // Perfect Battle
        if (this.data.battleStats.perfectBattles > 0 && !this.data.achievements.includes('perfect_battle')) {
            achievements.push('perfect_battle');
        }

        // Defeat 10 guests
        if (this.data.defeatedGuests.length >= 10 && !this.data.achievements.includes('ten_defeats')) {
            achievements.push('ten_defeats');
        }

        // Add new achievements
        if (achievements.length > 0) {
            this.data.achievements.push(...achievements);
            this.save();
        }

        return achievements;
    }
}

// Create singleton instance
const gameState = new GameState();
export default gameState;
