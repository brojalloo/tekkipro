// Shared avatar color utility for client/employee screens.
// Colors cycle based on the first character code of the name.

const AVATAR_COLORS = [
  { bg: 'rgba(27,94,32,0.10)', border: 'rgba(27,94,32,0.25)', text: '#1B5E20' },
  { bg: 'rgba(27,94,32,0.15)', border: 'rgba(27,94,32,0.30)', text: '#1B5E20' },
  { bg: 'rgba(255,214,0,0.15)', border: 'rgba(255,214,0,0.30)', text: '#C47D0A' },
  { bg: 'rgba(7,28,8,0.10)', border: 'rgba(7,28,8,0.30)', text: '#071C08' },
];

export function getAvatarColorByName(name, fallback = 'X') {
  const code = (name || fallback).charCodeAt(0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}
