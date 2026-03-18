<template>
  <div v-if="isActive" class="session-end-overlay">
    <div class="session-end-container">
      <h1 class="session-title">Session Summary</h1>

      <!-- Streak -->
      <div v-if="streak > 1" class="streak-badge">
        {{ streak }}-day streak!
      </div>

      <!-- NPCs encountered -->
      <div v-if="npcsThisSession.length > 0" class="npc-summary">
        <div class="summary-label">NPCs Encountered</div>
        <div v-for="npc in npcsThisSession" :key="npc.name" class="npc-row">
          <span class="npc-name">{{ npc.name }}</span>
          <span class="npc-status" :class="npc.captured ? 'captured' : 'escaped'">
            {{ npc.captured ? 'Captured' : 'Escaped' }}
          </span>
        </div>
      </div>

      <!-- Topics learned -->
      <div v-if="topicsLearned.length > 0" class="topics-section">
        <div class="summary-label">Topics Explored</div>
        <div class="topics-list">
          <span v-for="topic in topicsLearned" :key="topic" class="topic-tag">{{ topic }}</span>
        </div>
      </div>

      <!-- Knowledge Cards earned -->
      <div v-if="knowledgeCards.length > 0" class="kc-section">
        <div class="summary-label">Knowledge Cards Earned</div>
        <div v-for="card in knowledgeCards" :key="card" class="kc-item">{{ card }}</div>
      </div>

      <!-- Cliffhanger -->
      <div v-if="cliffhanger" class="cliffhanger-section">
        <p class="cliffhanger-text">{{ cliffhanger }}</p>
      </div>

      <!-- Actions -->
      <div class="session-actions">
        <button class="action-btn primary" @click="$emit('continue')">Continue Playing</button>
        <button class="action-btn" @click="shareProgress">Share Progress</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { GAME_NAME, GAME_URL } from '../constants.js';

const props = defineProps({
  isActive: Boolean,
  streak: { type: Number, default: 0 },
  npcsThisSession: { type: Array, default: () => [] },
  topicsLearned: { type: Array, default: () => [] },
  knowledgeCards: { type: Array, default: () => [] },
  cliffhanger: { type: String, default: '' }
});

defineEmits(['continue']);

function shareProgress() {
  const npcCount = props.npcsThisSession.length;
  const captured = props.npcsThisSession.filter(n => n.captured).length;
  const text = `I explored ${GAME_NAME} and encountered ${npcCount} NPCs (captured ${captured})! ${props.streak > 1 ? `${props.streak}-day streak! ` : ''}${GAME_URL}`;
  if (navigator.share) {
    navigator.share({ text }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(text);
  }
}
</script>

<style scoped>
.session-end-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9000;
  font-family: 'Press Start 2P', monospace, sans-serif;
}

.session-end-container {
  max-width: 480px;
  width: 90%;
  padding: 24px;
  background: #1a1a2e;
  border: 3px solid #FFD700;
  border-radius: 12px;
  text-align: center;
  max-height: 80vh;
  overflow-y: auto;
}

.session-title {
  font-size: 16px;
  color: #FFD700;
  margin: 0 0 16px;
}

.streak-badge {
  font-size: 12px;
  color: #FF6B35;
  margin-bottom: 16px;
  padding: 6px 12px;
  background: rgba(255, 107, 53, 0.1);
  border-radius: 20px;
  display: inline-block;
}

.summary-label {
  font-size: 9px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.npc-summary {
  margin-bottom: 16px;
}

.npc-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 9px;
}

.npc-name { color: #fff; }
.npc-status.captured { color: #4CAF50; }
.npc-status.escaped { color: #E74C3C; }

.topics-section {
  margin-bottom: 16px;
}

.topics-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.topic-tag {
  font-size: 8px;
  padding: 3px 8px;
  background: rgba(52, 152, 219, 0.2);
  border: 1px solid rgba(52, 152, 219, 0.3);
  border-radius: 12px;
  color: #3498DB;
}

.kc-section {
  margin-bottom: 16px;
}

.kc-item {
  font-size: 8px;
  color: #aaa;
  line-height: 1.5;
  padding: 4px 0;
}

.cliffhanger-section {
  margin: 16px 0;
  padding: 10px;
  border-left: 3px solid #FFD700;
  background: rgba(255, 215, 0, 0.05);
  border-radius: 0 6px 6px 0;
}

.cliffhanger-text {
  font-size: 9px;
  color: #FFD700;
  font-style: italic;
  line-height: 1.5;
  margin: 0;
}

.session-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 16px;
  flex-wrap: wrap;
}

.action-btn {
  font-size: 9px;
  font-family: inherit;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
}

.action-btn.primary {
  background: #E74C3C;
  border-color: #C0392B;
}
</style>
