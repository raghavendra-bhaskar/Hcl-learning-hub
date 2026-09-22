export const AVATAR_PRESETS = [
  { id: 'explorer',   emoji: '🧑‍🚀', label: 'Space Explorer',  description: 'Boldly goes where no AI has gone before',   outfit: '🚀', hat: '👒' },
  { id: 'scientist',  emoji: '🧑‍🔬', label: 'AI Scientist',    description: 'Experiments with neural architectures daily', outfit: '🔬', hat: '🥽' },
  { id: 'engineer',   emoji: '🧑‍💻', label: 'ML Engineer',     description: 'Turns coffee into production models',          outfit: '💻', hat: '🎧' },
  { id: 'robot',      emoji: '🤖',   label: 'AI Companion',    description: 'Part human, part algorithm, fully awesome',   outfit: '⚙️', hat: '🔋' },
  { id: 'wizard',     emoji: '🧙',   label: 'Data Wizard',     description: 'Casts spells with Python and PyTorch',         outfit: '🔮', hat: '🎩' },
  { id: 'ninja',      emoji: '🥷',   label: 'Cyber Ninja',     description: 'Silently deploys models at midnight',          outfit: '⚔️', hat: '🎭' },
  { id: 'detective',  emoji: '🕵️',   label: 'AI Detective',    description: 'Tracks down biases and data anomalies',        outfit: '🔍', hat: '🎓' },
  { id: 'superhero',  emoji: '🦸',   label: 'AI Hero',         description: 'Saves projects with clean pipelines',          outfit: '⚡', hat: '🦺' },
  { id: 'alien',      emoji: '👾',   label: 'Algorithm Entity','description': 'Emerged from the latent space of a GAN',    outfit: '🌌', hat: '📡' },
];

export const SKIN_TONES = [
  { id: 'light1',    color: '#FFDBB4', label: 'Light' },
  { id: 'light2',    color: '#ECC898', label: 'Light 2' },
  { id: 'medium1',   color: '#D4A373', label: 'Medium' },
  { id: 'medium2',   color: '#C38B5F', label: 'Medium 2' },
  { id: 'dark1',     color: '#A0694A', label: 'Dark' },
  { id: 'dark2',     color: '#7D4B35', label: 'Dark 2' },
  { id: 'deep1',     color: '#5C3420', label: 'Deep' },
  { id: 'deep2',     color: '#3D2010', label: 'Deep 2' },
  { id: 'fantasy1',  color: '#7EC8E3', label: 'Cyber Blue' },
  { id: 'fantasy2',  color: '#B5EAD7', label: 'Bio Green' },
  { id: 'fantasy3',  color: '#C7B8EA', label: 'Neural Violet' },
  { id: 'fantasy4',  color: '#FFB7B2', label: 'Neon Pink' },
];

export const BADGE_COLORS = [
  { id: 'cyan',    gradient: 'from-cyan-400 to-blue-500',    border: 'border-cyan-400',    label: 'Ocean',    glow: 'shadow-cyan-500/40' },
  { id: 'violet',  gradient: 'from-violet-400 to-purple-600',border: 'border-violet-400',  label: 'Cosmic',   glow: 'shadow-violet-500/40' },
  { id: 'emerald', gradient: 'from-emerald-400 to-teal-500', border: 'border-emerald-400', label: 'Matrix',   glow: 'shadow-emerald-500/40' },
  { id: 'orange',  gradient: 'from-orange-400 to-red-500',   border: 'border-orange-400',  label: 'Inferno',  glow: 'shadow-orange-500/40' },
  { id: 'pink',    gradient: 'from-pink-400 to-rose-500',    border: 'border-pink-400',    label: 'Sakura',   glow: 'shadow-pink-500/40' },
  { id: 'amber',   gradient: 'from-amber-400 to-yellow-500', border: 'border-amber-400',   label: 'Gold',     glow: 'shadow-amber-500/40' },
  { id: 'sky',     gradient: 'from-sky-400 to-indigo-500',   border: 'border-sky-400',     label: 'Nebula',   glow: 'shadow-sky-500/40' },
  { id: 'lime',    gradient: 'from-lime-400 to-green-500',   border: 'border-lime-400',    label: 'Pulse',    glow: 'shadow-lime-500/40' },
];

export const ACCESSORY_OPTIONS = [
  { id: 'none',       emoji: '',    label: 'None' },
  { id: 'glasses',    emoji: '🕶️',  label: 'Shades' },
  { id: 'headset',    emoji: '🎧',  label: 'Headset' },
  { id: 'crown',      emoji: '👑',  label: 'Crown' },
  { id: 'cap',        emoji: '🧢',  label: 'Cap' },
  { id: 'graduation', emoji: '🎓',  label: 'Grad Cap' },
  { id: 'hardhat',    emoji: '⛑️',  label: 'Hard Hat' },
  { id: 'beret',      emoji: '🪖',  label: 'Helmet' },
];

export const DEFAULT_AVATAR = {
  presetId: 'explorer',
  skinTone: '#ECC898',
  badgeColorId: 'cyan',
  accessoryId: 'glasses',
};
