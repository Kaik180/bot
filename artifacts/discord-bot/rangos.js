// Rank Management System

class RankManager {
    constructor() {
        this.ranks = {};
    }

    addRank(userId, rank) {
        this.ranks[userId] = rank;
    }

    getRank(userId) {
        return this.ranks[userId] || 'No rank assigned';
    }

    removeRank(userId) {
        delete this.ranks[userId];
    }
}

// Example usage
const rankManager = new RankManager();

rankManager.addRank('user123', 'Admin');
console.log(rankManager.getRank('user123')); // Output: 'Admin'
rankManager.removeRank('user123');
console.log(rankManager.getRank('user123')); // Output: 'No rank assigned'