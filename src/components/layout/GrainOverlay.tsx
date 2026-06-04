/** Faint paper/linen grain across the whole site  printed, handmade feel. */
export function GrainOverlay() {
  return (
    <div className="grain" aria-hidden>
      <svg className="h-full w-full">
        <filter id="paper-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#paper-grain)" />
      </svg>
    </div>
  );
}
