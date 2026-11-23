import React, { useId } from 'react';

export type WildflowerKind =
  | 'da_quy'
  | 'cuc_hoa_mi'
  | 'hoa_buom'
  | 'sim_tim'
  | 'cuc_cam';

export type ButterflyKind = 'monarch' | 'morpho' | 'swallowtail' | 'rosewing';

interface WildflowerProps {
  kind: WildflowerKind;
  swayDeg?: number;
  className?: string;
}

const FLOWER_THEMES: Record<
  WildflowerKind,
  { outer: string; inner: string; vein: string; center: string; dot: string }
> = {
  da_quy: {
    outer: '#facc15',
    inner: '#fef08a',
    vein: '#eab308',
    center: '#b45309',
    dot: '#fde047',
  },
  cuc_hoa_mi: {
    outer: '#ffffff',
    inner: '#fef9c3',
    vein: '#e2e8f0',
    center: '#f59e0b',
    dot: '#fef08a',
  },
  hoa_buom: {
    outer: '#f472b6',
    inner: '#fbcfe8',
    vein: '#db2777',
    center: '#eab308',
    dot: '#fef9c3',
  },
  sim_tim: {
    outer: '#a855f7',
    inner: '#e9d5ff',
    vein: '#7e22ce',
    center: '#facc15',
    dot: '#fef08a',
  },
  cuc_cam: {
    outer: '#fb923c',
    inner: '#fed7aa',
    vein: '#ea580c',
    center: '#9a3412',
    dot: '#fde047',
  },
};

/**
 * Botanical multi-layered 2D illustrated Wildflower cluster with curved stems,
 * veined leaves, overlapping gradient petals, and textured pollen center.
 */
export const WildflowerClusterSVG: React.FC<WildflowerProps> = ({
  kind,
  swayDeg = 0,
  className = 'w-14 h-20',
}) => {
  const uid = useId().replace(/:/g, '');
  const theme = FLOWER_THEMES[kind];

  const renderBlossom = (cx: number, cy: number, scale: number, rot: number) => {
    const petals = kind === 'cuc_hoa_mi' ? 10 : 6;
    return (
      <g transform={`translate(${cx}, ${cy}) scale(${scale}) rotate(${rot})`}>
        {Array.from({ length: petals }).map((_, idx) => {
          const deg = (idx / petals) * 360;
          return (
            <g key={idx} transform={`rotate(${deg})`}>
              <path
                d="M0 0 C-5 -8, -7 -20, 0 -24 C7 -20, 5 -8, 0 0 Z"
                fill={`url(#petal-${uid})`}
                stroke={theme.vein}
                strokeWidth="0.7"
                opacity="0.96"
              />
              <line
                x1="0"
                y1="-3"
                x2="0"
                y2="-19"
                stroke={theme.vein}
                strokeWidth="0.6"
                opacity="0.45"
              />
            </g>
          );
        })}
        {/* Golden textured pollen disk */}
        <circle
          cx="0"
          cy="0"
          r="5.6"
          fill={theme.center}
          stroke="#78350f"
          strokeWidth="0.6"
        />
        <circle cx="-1.8" cy="-1.5" r="1.1" fill={theme.dot} />
        <circle cx="2" cy="-1.2" r="1" fill={theme.dot} />
        <circle cx="0" cy="2" r="1.2" fill={theme.dot} />
      </g>
    );
  };

  return (
    <svg
      viewBox="0 0 90 120"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`petal-${uid}`} x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor={theme.inner} />
          <stop offset="65%" stopColor={theme.outer} />
          <stop offset="100%" stopColor={theme.outer} />
        </linearGradient>
        <linearGradient id={`leaf-${uid}`} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3d7a47" />
          <stop offset="100%" stopColor="#7dc87e" />
        </linearGradient>
      </defs>

      <g transform={`rotate(${swayDeg}, 45, 114)`}>
        {/* Organic curved stems */}
        <path
          d="M45 114 Q42 74 44 36"
          fill="none"
          stroke="#4b8a53"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M45 114 Q28 84 22 52"
          fill="none"
          stroke="#4b8a53"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M45 114 Q62 86 68 58"
          fill="none"
          stroke="#4b8a53"
          strokeWidth="2.3"
          strokeLinecap="round"
        />

        {/* Botanical veined leaves */}
        <path
          d="M44 96 C26 90, 14 78, 12 72 C24 72, 36 80, 44 96 Z"
          fill={`url(#leaf-${uid})`}
          stroke="#2f6138"
          strokeWidth="0.9"
        />
        <path
          d="M45 90 C64 84, 74 72, 78 66 C66 66, 54 74, 45 90 Z"
          fill={`url(#leaf-${uid})`}
          stroke="#2f6138"
          strokeWidth="0.9"
        />
        <path
          d="M36 82 C26 70, 22 62, 26 56 C32 62, 36 72, 36 82 Z"
          fill={`url(#leaf-${uid})`}
          stroke="#2f6138"
          strokeWidth="0.8"
        />

        {/* Layered blossoms */}
        {renderBlossom(22, 50, 0.72, -14)}
        {renderBlossom(68, 56, 0.68, 18)}
        {renderBlossom(44, 34, 0.96, 6)}
      </g>
    </svg>
  );
};

interface ButterflyProps {
  kind: ButterflyKind;
  flapPhase?: number; // 0..2PI
  tiltDeg?: number;
  className?: string;
}

const BUTTERFLY_PALETTES: Record<
  ButterflyKind,
  { tip: string; mid: string; base: string; rim: string }
> = {
  monarch: {
    tip: '#ea580c',
    mid: '#fb923c',
    base: '#fde047',
    rim: '#292524',
  },
  morpho: {
    tip: '#0284c7',
    mid: '#38bdf8',
    base: '#bae6fd',
    rim: '#1e293b',
  },
  swallowtail: {
    tip: '#ca8a04',
    mid: '#facc15',
    base: '#fef9c3',
    rim: '#27272a',
  },
  rosewing: {
    tip: '#db2777',
    mid: '#f472b6',
    base: '#fce7f3',
    rim: '#3f2e3e',
  },
};

/**
 * Realistic illustrated 2D Butterfly with patterned wing cells, veins,
 * marginal spots, segmented body, clubbed antennae, and perspective flapping.
 */
export const RealisticButterflySVG: React.FC<ButterflyProps> = ({
  kind,
  flapPhase = 0,
  tiltDeg = 0,
  className = 'w-11 h-11',
}) => {
  const uid = useId().replace(/:/g, '');
  const pal = BUTTERFLY_PALETTES[kind];

  // Smooth perspective wing flap (0.28 .. 1.0)
  const wingScaleX = 0.28 + Math.abs(Math.cos(flapPhase)) * 0.72;

  const renderWingHalf = (side: 1 | -1) => (
    <g transform={`translate(50, 50) scale(${side * wingScaleX}, 1)`}>
      {/* Forewing */}
      <path
        d="M0 -6 C12 -32, 42 -40, 47 -22 C50 -6, 32 6, 4 6 Z"
        fill={`url(#wgrad-${uid})`}
        stroke={pal.rim}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Hindwing with gentle swallowtail curve */}
      <path
        d="M2 5 C26 6, 42 20, 34 34 C28 42, 16 42, 10 34 C4 26, 2 14, 2 5 Z"
        fill={`url(#wgrad-${uid})`}
        stroke={pal.rim}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Wing venation */}
      <g stroke={pal.rim} strokeWidth="1.2" opacity="0.7" fill="none">
        <path d="M2 -2 Q22 -22 41 -22" />
        <path d="M2 0 Q24 -10 43 -10" />
        <path d="M2 2 Q22 2 34 4" />
        <path d="M2 8 Q18 18 30 28" />
        <path d="M2 12 Q12 24 18 34" />
      </g>
      {/* Delicate white marginal spots */}
      <circle cx="41" cy="-22" r="2.2" fill="#fffbeb" />
      <circle cx="43" cy="-14" r="1.9" fill="#fffbeb" />
      <circle cx="38" cy="-6" r="1.6" fill="#fffbeb" />
      <circle cx="31" cy="29" r="1.8" fill="#fffbeb" />
      <circle cx="24" cy="35" r="1.6" fill="#fffbeb" />
    </g>
  );

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id={`wgrad-${uid}`} cx="15%" cy="45%" r="85%">
          <stop offset="0%" stopColor={pal.base} />
          <stop offset="55%" stopColor={pal.mid} />
          <stop offset="100%" stopColor={pal.tip} />
        </radialGradient>
      </defs>

      <g transform={`rotate(${tiltDeg}, 50, 50)`}>
        {renderWingHalf(-1)}
        {renderWingHalf(1)}

        {/* Slender thorax & abdomen */}
        <ellipse cx="50" cy="48" rx="3.2" ry="8" fill="#292524" />
        <ellipse cx="50" cy="62" rx="2.4" ry="10" fill="#3f3632" />
        <circle cx="50" cy="38" r="3.4" fill="#292524" />

        {/* Clubbed antennae */}
        <path
          d="M48.5 36 Q42 24 37 21"
          fill="none"
          stroke="#292524"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <circle cx="37" cy="21" r="1.6" fill="#292524" />
        <path
          d="M51.5 36 Q58 24 63 21"
          fill="none"
          stroke="#292524"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <circle cx="63" cy="21" r="1.6" fill="#292524" />
      </g>
    </svg>
  );
};
