export const formatDuration = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export const formatRelativeTime = (isoDate) => {
  const minutes = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} dia${days > 1 ? 's' : ''} atrás`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mês${months > 1 ? 'es' : ''} atrás`;
  const years = Math.floor(months / 12);
  return `${years} ano${years > 1 ? 's' : ''} atrás`;
};
