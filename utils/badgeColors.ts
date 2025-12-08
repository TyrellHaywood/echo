const BADGE_COLORS = [
  '#7568DE',
  '#FE6845',
  '#468845',
  '#FFA046',
  '#9ECB45',
  '#DAD4EF',
  '#FBFBF2',
  '#AAFAC8',
  '#FFFFC7',
  '#E4B7E5',
  '#C1D7AE',
];

// Generate a consistent color based on a string (tag/interest name)
export function getBadgeColor(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % BADGE_COLORS.length;
  return BADGE_COLORS[index];
}

// Convert hex to rgba with opacity
export function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}