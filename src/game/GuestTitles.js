/**
 * NPC Titles Mapping
 * Maps NPC names to their role/specialty in the Village of Heartwell
 */

export const GUEST_TITLES = {
  // Chapter 1: The Library
  "Lipidus the Wise": "Keeper of the Lipid Scrolls",
  "Nurse Heartwell": "Village Healer",
  "The Cholesterol Sage": "Myth Debunker",
  "Fatty the Friendly": "Fat Expert",
  "Elder Plaque": "Library Guardian",
  // Chapter 2: The Clinic
  "Dr. Panela": "Blood Test Specialist",
  "Lab Tech Luna": "Lab Scientist",
  "The Number Cruncher": "Advanced Testing Expert",
  "Range Ranger": "Risk Range Patroller",
  "Fasting Frank": "Clinic Guardian",
  // Chapter 3: The Lab
  "Professor Particle": "Particle Researcher",
  "Apolipora": "ApoB Counter",
  "The LDL Hunter": "Atherosclerosis Tracker",
  "Dense Debbie": "Small Dense LDL Expert",
  "Lp(a) the Ghost": "Lab Guardian",
  // Chapter 4: The Garden
  "Chef Olive": "Mediterranean Chef",
  "Cardio Kate": "Exercise Coach",
  "The Mediterranean Monk": "Diet Scholar",
  "Fiber the Fox": "Food Scientist",
  "Coach Vitale": "Garden Guardian",
  // Chapter 5: The Apothecary
  "Dr. Statina": "Statin Specialist",
  "Eze the Absorber": "Absorption Expert",
  "PCSK9 the Guardian": "Antibody Warrior",
  "Inclisiran the Whisperer": "Gene Silencer",
  "Omega Rex": "Apothecary Guardian",
  // Chapter 6: The Temple
  "High Priestess Risk": "Risk Assessor",
  "Calcium the Seer": "CAC Scan Reader",
  "The Lifestyle Oracle": "Prevention Scholar",
  "Aspirin the Fallen": "Cautionary Tale",
  "Inflammation the Shadow": "Temple Guardian"
};

/**
 * Get title for an NPC by name
 * @param {string} guestName - Name of the NPC
 * @returns {string} Title/specialty or empty string
 */
export function getGuestTitle(guestName) {
  return GUEST_TITLES[guestName] || '';
}
