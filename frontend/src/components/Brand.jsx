export default function Brand({ compact = false, inverted = false }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''} ${inverted ? 'brand--inverted' : ''}`}>
      <img src="/assets/aloo-logo.png" alt="aloo" />
      <span>SMM Panel</span>
    </div>
  );
}
