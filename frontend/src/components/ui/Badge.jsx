// Badge — small coloured label
// Props: label, color (hex or tailwind class), variant ('solid'|'outline')
export default function Badge({ label, color, variant = 'solid', className = '' }) {
  if (color?.startsWith('#')) {
    const style =
      variant === 'solid'
        ? { backgroundColor: color, color: '#fff' }
        : { borderColor: color, color, border: '1px solid' };
    return (
      <span style={style} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
        {label}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color || 'bg-gray-100 text-gray-700'} ${className}`}>
      {label}
    </span>
  );
}
