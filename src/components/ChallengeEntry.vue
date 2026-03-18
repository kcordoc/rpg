<template>
  <div class="challenge-overlay">
    <div class="challenge-container">
      <!-- Header -->
      <div class="challenge-header">
        <h1 class="challenge-title">{{ GAME_NAME }} Challenge!</h1>
        <p v-if="senderName" class="sender-info">
          {{ senderName }} scored {{ senderScore }}% against <strong>{{ npcDisplayName }}</strong>
        </p>
        <p class="challenge-prompt">Can you beat it?</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">Loading challenge...</div>

      <!-- NPC not found -->
      <div v-if="!loading && !npcData" class="error-state">
        <p>Challenge NPC not found.</p>
        <button class="action-btn" @click="$emit('explore')">Explore the Full Game</button>
      </div>

      <!-- Quiz Phase -->
      <div v-if="!loading && npcData && !quizDone" class="quiz-section">
        <div class="question-counter">Question {{ currentQ + 1 }} / {{ totalQuestions }}</div>
        <p class="question-text">{{ questions[currentQ].question }}</p>
        <div class="choices">
          <button
            v-for="(choice, idx) in questions[currentQ].choices"
            :key="idx"
            class="choice-btn"
            :class="{
              correct: answered && choice === questions[currentQ].answer,
              wrong: answered && selectedChoice === choice && choice !== questions[currentQ].answer,
              disabled: answered
            }"
            :disabled="answered"
            @click="selectAnswer(choice)"
          >
            {{ choice }}
          </button>
        </div>
        <p v-if="answered" class="explanation">{{ questions[currentQ].explanation }}</p>
        <button v-if="answered" class="next-btn" @click="nextQuestion">
          {{ currentQ < totalQuestions - 1 ? 'Next Question' : 'See Results' }}
        </button>
      </div>

      <!-- Results -->
      <div v-if="quizDone" class="results-section">
        <h2 class="results-title">Results</h2>
        <div class="score-comparison">
          <div class="score-box you">
            <div class="score-label">You</div>
            <div class="score-value">{{ myScore }}%</div>
          </div>
          <div class="vs-text">vs</div>
          <div class="score-box sender" v-if="senderName">
            <div class="score-label">{{ senderName }}</div>
            <div class="score-value">{{ senderScore }}%</div>
          </div>
        </div>
        <p class="result-verdict">{{ verdict }}</p>
        <div class="result-actions">
          <button class="action-btn primary" @click="$emit('explore')">Explore Full Game</button>
          <button class="action-btn" @click="shareChallenge">Challenge Back</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { GAME_NAME, GAME_URL } from '../constants.js';

const props = defineProps({
  npcSlug: { type: String, default: '' },
  senderName: { type: String, default: '' },
  senderScore: { type: Number, default: 0 },
  questionsData: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['explore']);

const loading = ref(true);
const npcData = ref(null);
const questions = ref([]);
const currentQ = ref(0);
const answered = ref(false);
const selectedChoice = ref('');
const correctCount = ref(0);
const quizDone = ref(false);
const totalQuestions = 3;

const npcDisplayName = computed(() => npcData.value?.guest || props.npcSlug);

const myScore = computed(() => {
  return Math.round((correctCount.value / totalQuestions) * 100);
});

const verdict = computed(() => {
  if (!props.senderName) return `You scored ${myScore.value}%!`;
  if (myScore.value > props.senderScore) return 'You won! Great job!';
  if (myScore.value === props.senderScore) return "It's a tie!";
  return `${props.senderName} wins this time!`;
});

onMounted(() => {
  loadChallenge();
});

function loadChallenge() {
  if (!props.questionsData?.episodes) {
    loading.value = false;
    return;
  }

  // Find NPC by slug match
  const slug = props.npcSlug.toLowerCase();
  const npc = props.questionsData.episodes.find(ep => {
    const epSlug = ep.guest.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return epSlug === slug;
  });

  if (npc) {
    npcData.value = npc;
    // Pick 3 random questions
    const shuffled = [...npc.questions].sort(() => Math.random() - 0.5);
    questions.value = shuffled.slice(0, totalQuestions);
  }

  loading.value = false;
}

function selectAnswer(choice) {
  if (answered.value) return;
  answered.value = true;
  selectedChoice.value = choice;
  if (choice === questions.value[currentQ.value].answer) {
    correctCount.value++;
  }
}

function nextQuestion() {
  if (currentQ.value < totalQuestions - 1) {
    currentQ.value++;
    answered.value = false;
    selectedChoice.value = '';
  } else {
    quizDone.value = true;
  }
}

function shareChallenge() {
  const npcSlug = npcData.value.guest.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const url = `${GAME_URL}?challenge=${npcSlug}&score=${myScore.value}`;
  const text = `I scored ${myScore.value}% against ${npcData.value.guest}! Can you beat me? ${url}`;
  if (navigator.share) {
    navigator.share({ text }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(text);
  }
}
</script>

<style scoped>
.challenge-overlay {
  position: fixed;
  inset: 0;
  background: #1a1a2e;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  font-family: 'Press Start 2P', monospace, sans-serif;
}

.challenge-container {
  max-width: 500px;
  width: 90%;
  padding: 24px;
  text-align: center;
}

.challenge-title {
  font-size: 18px;
  color: #E74C3C;
  margin: 0 0 12px;
}

.sender-info {
  font-size: 10px;
  color: #aaa;
  margin: 0 0 8px;
}

.challenge-prompt {
  font-size: 12px;
  color: #FFD700;
  margin: 0 0 20px;
}

.loading-state, .error-state {
  font-size: 10px;
  color: #888;
  padding: 20px;
}

.question-counter {
  font-size: 9px;
  color: #666;
  margin-bottom: 12px;
}

.question-text {
  font-size: 11px;
  color: #fff;
  line-height: 1.6;
  margin: 0 0 16px;
}

.choices {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.choice-btn {
  padding: 10px 12px;
  font-size: 9px;
  font-family: inherit;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.choice-btn:hover:not(.disabled) {
  border-color: #FFD700;
  background: rgba(255, 215, 0, 0.1);
}

.choice-btn.correct {
  border-color: #4CAF50;
  background: rgba(76, 175, 80, 0.2);
}

.choice-btn.wrong {
  border-color: #E74C3C;
  background: rgba(231, 76, 60, 0.2);
}

.choice-btn.disabled {
  cursor: default;
  opacity: 0.7;
}

.explanation {
  font-size: 9px;
  color: #aaa;
  line-height: 1.5;
  margin: 8px 0;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.next-btn {
  font-size: 10px;
  font-family: inherit;
  padding: 8px 20px;
  background: #FFD700;
  color: #000;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 8px;
}

.results-title {
  font-size: 14px;
  color: #FFD700;
  margin: 0 0 16px;
}

.score-comparison {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 16px;
}

.score-box {
  padding: 12px 20px;
  border-radius: 8px;
  min-width: 80px;
}

.score-box.you {
  background: rgba(52, 152, 219, 0.2);
  border: 2px solid #3498DB;
}

.score-box.sender {
  background: rgba(231, 76, 60, 0.2);
  border: 2px solid #E74C3C;
}

.score-label {
  font-size: 8px;
  color: #aaa;
  margin-bottom: 4px;
}

.score-value {
  font-size: 18px;
  color: #fff;
}

.vs-text {
  font-size: 12px;
  color: #666;
}

.result-verdict {
  font-size: 11px;
  color: #FFD700;
  margin: 0 0 16px;
}

.result-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
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

.action-btn:hover {
  opacity: 0.9;
}
</style>
