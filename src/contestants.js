// 100 Contestants — each has a number, name, age group, color, and personality
const AGE_GROUPS = [
  { label: 'Baby',     emoji: '👶', cry: true,  skillLevel: 1, ageRange: '1-2'   },
  { label: 'Toddler',  emoji: '🧒', cry: true,  skillLevel: 2, ageRange: '2-4'   },
  { label: 'Kid',      emoji: '👦', cry: false, skillLevel: 3, ageRange: '5-10'  },
  { label: 'Preteen',  emoji: '🧑', cry: false, skillLevel: 4, ageRange: '11-12' },
  { label: 'Teenager', emoji: '👱', cry: false, skillLevel: 5, ageRange: '13-17' },
  { label: 'Adult',    emoji: '🧔', cry: false, skillLevel: 6, ageRange: '18-64' },
  { label: 'Grandparent', emoji: '👴', cry: false, skillLevel: 5, ageRange: '65+' },
];

const SHIRT_COLORS = [
  '#FF3B30','#FF9500','#FFCC00','#34C759','#00C7BE',
  '#007AFF','#5856D6','#FF2D55','#FF6B35','#1AC8DB',
];

const FIRST_NAMES = [
  'Emma','Liam','Olivia','Noah','Ava','William','Sophia','James','Isabella','Oliver',
  'Mia','Elijah','Charlotte','Lucas','Amelia','Mason','Harper','Logan','Evelyn','Ethan',
  'Abigail','Aiden','Emily','Grayson','Elizabeth','Caden','Mila','Jackson','Ella','Sebastian',
  'Riley','Mateo','Aria','Owen','Nora','Samuel','Luna','Jack','Sofia','Ryan',
  'Chloe','Nathan','Layla','Hunter','Penelope','Christian','Lily','Diego','Zoey','Isaiah',
  'Hannah','Jayden','Lillian','David','Addison','Eli','Aubrey','Jonathan','Ellie','Anthony',
  'Stella','Cameron','Natalie','Connor','Zoe','Isaac','Leah','Jordan','Hazel','Zachary',
  'Violet','Austin','Aurora','Levi','Savannah','Dylan','Audrey','Lincoln','Brooklyn','Aaron',
  'Bella','Angel','Claire','Thomas','Skylar','Josiah','Lucy','Nolan','Paisley','Wyatt',
  'Everly','Caleb','Anna','Luke','Caroline','Henry','Genesis','Alexa','Scarlett','Daniel',
];

const TOTAL = 11; // Bryce + 10 others

function generateContestants() {
  const contestants = [];
  for (let i = 1; i <= TOTAL; i++) {
    const ageGroup = AGE_GROUPS[Math.floor(Math.random() * AGE_GROUPS.length)];
    const color = SHIRT_COLORS[(i - 1) % SHIRT_COLORS.length];
    contestants.push({
      id: i,
      name: FIRST_NAMES[i - 1] || `Player ${i}`,
      number: i,
      ageGroup,
      shirtColor: color,
      alive: true,
      isPlayer: false,
    });
  }
  // Contestant #1 is the player (Bryce / YOU)
  contestants[0].isPlayer = true;
  contestants[0].name = 'YOU';
  return contestants;
}
