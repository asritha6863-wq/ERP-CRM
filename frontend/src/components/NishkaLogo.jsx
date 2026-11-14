/**
 * NISHKA Momentous Jewellery logo (image from /public/nishka-logo.png).
 * `white` renders a white version for dark or pink backgrounds.
 */
export default function NishkaLogo({ size = 'md', white = false }) {
  const height = size === 'sm' ? 32 : size === 'lg' ? 56 : 40;
  return (
    <img
      src="/nishka-logo.png"
      alt="NISHKA Momentous Jewellery"
      style={{
        height,
        width: 'auto',
        display: 'block',
        filter: white ? 'brightness(0) invert(1)' : undefined,
      }}
    />
  );
}
