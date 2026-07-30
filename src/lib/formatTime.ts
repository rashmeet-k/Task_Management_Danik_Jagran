export function formatTimeAgo(timestamp: string) {
  if (!timestamp || timestamp === 'Just now') return 'Just now';
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return timestamp;
    
    // Convert to relative time string, handle negative differences properly
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    
    if (diff < 0) return 'Just now'; // Handle clock skew
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch(e) {
    return timestamp;
  }
}
