/**
 * NISHKA Momentous Jewellery — inline SVG logo
 * Matches the brand mark: flower/starburst icon in pink + wordmark
 */
export default function NishkaLogo({ size = 'md', white = false }) {
  const textColor = white ? '#ffffff' : '#1a1a2e';
  const subColor  = white ? 'rgba(255,255,255,0.65)' : '#6b7280';
  const pinkColor = '#f72f6e';

  const scale = size === 'sm' ? 0.75 : size === 'lg' ? 1.3 : 1;

  return (
    <div className="flex items-center gap-2.5" style={{ transform: `scale(${scale})`, transformOrigin: 'left center' }}>
      {/* Flower / starburst mark */}
      <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {/* Petal ring */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
          <ellipse
            key={i}
            cx="19" cy="10"
            rx="3.2" ry="6.5"
            fill={pinkColor}
            fillOpacity={i % 2 === 0 ? '1' : '0.55'}
            transform={`rotate(${deg} 19 19)`}
          />
        ))}
        {/* Centre dot */}
        <circle cx="19" cy="19" r="4.5" fill={pinkColor} />
        <circle cx="19" cy="19" r="2.5" fill="white" />
        {/* Crown tip at top */}
        <path d="M19 2 L20.5 7 L19 6 L17.5 7 Z" fill={pinkColor} />
      </svg>

      {/* Wordmark */}
      <div className="leading-none">
        <div style={{ color: textColor, fontSize: 20, fontWeight: 800, letterSpacing: '0.08em', fontFamily: 'Inter, sans-serif' }}>
          NiŜHKA
        </div>
        <div style={{ color: subColor, fontSize: 8, fontWeight: 600, letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: 1 }}>
          Momentous Jewellery
        </div>
      </div>
    </div>
  );
}
