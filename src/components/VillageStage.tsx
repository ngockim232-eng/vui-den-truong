import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChibiAction,
  ChibiExpression,
  GamePhase,
  Student,
  SurpriseEvent,
  WeatherMode,
} from '../types';
import { ChibiCharacterSVG } from './ChibiCharacterSVG';
import {
  ButterflyKind,
  RealisticButterflySVG,
  WildflowerClusterSVG,
  WildflowerKind,
} from './RealisticNature';

interface VillageStageProps {
  students: Student[];
  phase: GamePhase;
  targetIds: string[];
  travelSeconds: number;
  dialogueSpeakerId: string | null;
  dialogueText: string | null;
  activeSurprise?: SurpriseEvent | null;
  weather?: WeatherMode;
  onInspectStudent?: (student: Student) => void;
}

interface FlowerSpot {
  id: string;
  xPct: number;
  yPct: number;
  kind: WildflowerKind;
  scale: number;
  phaseOffset: number;
}

interface ButterflySpot {
  id: string;
  baseX: number;
  baseY: number;
  ampX: number;
  ampY: number;
  speed: number;
  phaseOffset: number;
  kind: ButterflyKind;
  sizePx: number;
}

interface FloatingPetalSpec {
  id: string;
  startX: number;
  startY: number;
  speedY: number;
  speedX: number;
  swayAmp: number;
  swayFreq: number;
  rotSpeed: number;
  size: number;
  color: string;
  accent: string;
  phase: number;
  extraOnly?: boolean;
}

interface SunSparkleSpec {
  id: string;
  x: number;
  y: number;
  size: number;
  speed: number;
  phase: number;
  extraOnly?: boolean;
}

const FLOWER_KINDS: WildflowerKind[] = [
  'da_quy',
  'cuc_hoa_mi',
  'hoa_buom',
  'sim_tim',
  'cuc_cam',
];

const BUTTERFLY_KINDS: ButterflyKind[] = [
  'monarch',
  'morpho',
  'swallowtail',
  'rosewing',
];

// Smooth, extended winding S-curve centerline X% from school gate (y=30.5%) to foreground (y=99%)
function roadCenterX(yPct: number): number {
  const s = Math.max(0, Math.min(1, (yPct - 30.5) / (99 - 30.5)));
  const envelope = Math.sin(s * Math.PI * 0.94);
  return 50 - Math.sin(s * Math.PI * 2.55) * 16.5 * (0.32 + 0.68 * envelope);
}

// Perspective road half-width in % (narrower at distant gate, wider at foreground)
function roadHalfWidthPct(yPct: number): number {
  const s = Math.max(0, Math.min(1, (yPct - 30.5) / (99 - 30.5)));
  return 4.8 + Math.pow(s, 1.35) * 20.5;
}

// Build a smooth SVG quadratic-spline path matching roadCenterX(y) in 1600x900 viewBox
function buildWindingRoadPath(
  widthScale: number,
  extraPct: number,
  yStart = 30.5,
  yEnd = 104,
): string {
  const steps = 30;
  const leftPts: [number, number][] = [];
  const rightPts: [number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const yPct = yStart + ((yEnd - yStart) * i) / steps;
    const cx = roadCenterX(yPct);
    const hw = roadHalfWidthPct(yPct) * widthScale + extraPct;
    const yPx = (yPct / 100) * 900;
    leftPts.push([((cx - hw) / 100) * 1600, yPx]);
    rightPts.push([((cx + hw) / 100) * 1600, yPx]);
  }

  const parts: string[] = [`M ${leftPts[0][0].toFixed(1)} ${leftPts[0][1].toFixed(1)}`];
  for (let i = 1; i < leftPts.length - 1; i++) {
    const xc = ((leftPts[i][0] + leftPts[i + 1][0]) / 2).toFixed(1);
    const yc = ((leftPts[i][1] + leftPts[i + 1][1]) / 2).toFixed(1);
    parts.push(`Q ${leftPts[i][0].toFixed(1)} ${leftPts[i][1].toFixed(1)}, ${xc} ${yc}`);
  }
  const lastL = leftPts[leftPts.length - 1];
  parts.push(`L ${lastL[0].toFixed(1)} ${lastL[1].toFixed(1)}`);

  const revR = [...rightPts].reverse();
  parts.push(`L ${revR[0][0].toFixed(1)} ${revR[0][1].toFixed(1)}`);
  for (let i = 1; i < revR.length - 1; i++) {
    const xc = ((revR[i][0] + revR[i + 1][0]) / 2).toFixed(1);
    const yc = ((revR[i][1] + revR[i + 1][1]) / 2).toFixed(1);
    parts.push(`Q ${revR[i][0].toFixed(1)} ${revR[i][1].toFixed(1)}, ${xc} ${yc}`);
  }
  const lastR = revR[revR.length - 1];
  parts.push(`L ${lastR[0].toFixed(1)} ${lastR[1].toFixed(1)} Z`);
  return parts.join(' ');
}

const ROAD_VERGE_PATH = buildWindingRoadPath(1.18, 3.6);
const ROAD_SHOULDER_PATH = buildWindingRoadPath(1.06, 1.4);
const ROAD_MAIN_PATH = buildWindingRoadPath(1.0, 0);
const ROAD_HIGHLIGHT_PATH = buildWindingRoadPath(0.56, 0);

const ROAD_PEBBLES = [34.5, 40, 46, 52.5, 59, 66, 73.5, 81, 88.5, 95].map((yPct, idx) => {
  const s = (yPct - 30.5) / (99 - 30.5);
  const cx = ((roadCenterX(yPct) + (idx % 2 === 0 ? -1.4 : 1.6)) / 100) * 1600;
  const cy = (yPct / 100) * 900;
  const w = 18 + s * 50;
  const h = 4.5 + s * 11.5;
  return { cx, cy, w, h, rot: (idx % 2 === 0 ? -1 : 1) * (4 + (idx % 3) * 3) };
});

// Roadside wildflowers hugging the curved left & right banks of the extended winding road
const ROADSIDE_FLOWERS: FlowerSpot[] = [
  37, 41, 45, 49, 53.5, 58, 62.5, 67, 71.5, 76, 81, 86, 91, 96,
].flatMap((yPct, idx) => {
  const cx = roadCenterX(yPct);
  const hw = roadHalfWidthPct(yPct);
  const s = Math.max(0, Math.min(1, (yPct - 30.5) / (99 - 30.5)));
  const scale = 0.42 + Math.pow(s, 1.15) * 0.84;
  const leftX = Math.max(3, cx - hw - 3.2 - (idx % 2) * 3.2);
  const rightX = Math.min(97, cx + hw + 3.2 + ((idx + 1) % 2) * 3.2);
  return [
    {
      id: `fl-l-${idx}`,
      xPct: leftX,
      yPct,
      kind: FLOWER_KINDS[idx % FLOWER_KINDS.length],
      scale,
      phaseOffset: idx * 0.7,
    },
    {
      id: `fl-r-${idx}`,
      xPct: rightX,
      yPct: yPct + 1.2,
      kind: FLOWER_KINDS[(idx + 2) % FLOWER_KINDS.length],
      scale,
      phaseOffset: idx * 0.9 + 1.1,
    },
  ];
});

const AMBIENT_BUTTERFLIES: ButterflySpot[] = [
  { id: 'bf-1', baseX: 16, baseY: 50, ampX: 6, ampY: 3.5, speed: 0.75, phaseOffset: 0.2, kind: 'monarch', sizePx: 42 },
  { id: 'bf-2', baseX: 84, baseY: 51, ampX: 5.5, ampY: 4, speed: 0.85, phaseOffset: 1.4, kind: 'morpho', sizePx: 40 },
  { id: 'bf-3', baseX: 11, baseY: 64, ampX: 7, ampY: 4, speed: 0.65, phaseOffset: 2.5, kind: 'swallowtail', sizePx: 44 },
  { id: 'bf-4', baseX: 89, baseY: 64, ampX: 6.5, ampY: 3.5, speed: 0.72, phaseOffset: 3.7, kind: 'rosewing', sizePx: 42 },
  { id: 'bf-5', baseX: 22, baseY: 74, ampX: 8, ampY: 4.5, speed: 0.8, phaseOffset: 0.9, kind: 'morpho', sizePx: 46 },
  { id: 'bf-6', baseX: 78, baseY: 75, ampX: 7.5, ampY: 4, speed: 0.7, phaseOffset: 2.1, kind: 'monarch', sizePx: 46 },
  { id: 'bf-7', baseX: 8, baseY: 82, ampX: 6, ampY: 3, speed: 0.9, phaseOffset: 4.2, kind: 'rosewing', sizePx: 48 },
  { id: 'bf-8', baseX: 92, baseY: 82, ampX: 6, ampY: 3.5, speed: 0.82, phaseOffset: 5.1, kind: 'swallowtail', sizePx: 48 },
  { id: 'bf-9', baseX: 33, baseY: 44, ampX: 4.5, ampY: 2.5, speed: 0.95, phaseOffset: 1.8, kind: 'rosewing', sizePx: 34 },
  { id: 'bf-10', baseX: 67, baseY: 45, ampX: 4.5, ampY: 2.5, speed: 0.88, phaseOffset: 3.3, kind: 'monarch', sizePx: 34 },
];

const SWARM_BUTTERFLIES: ButterflySpot[] = [
  { id: 'sw-1', baseX: 40, baseY: 56, ampX: 14, ampY: 7, speed: 1.15, phaseOffset: 0.4, kind: 'morpho', sizePx: 46 },
  { id: 'sw-2', baseX: 58, baseY: 58, ampX: 15, ampY: 6, speed: 1.05, phaseOffset: 1.7, kind: 'monarch', sizePx: 48 },
  { id: 'sw-3', baseX: 48, baseY: 66, ampX: 18, ampY: 8, speed: 1.25, phaseOffset: 2.9, kind: 'rosewing', sizePx: 44 },
  { id: 'sw-4', baseX: 34, baseY: 69, ampX: 12, ampY: 6, speed: 1.1, phaseOffset: 4.1, kind: 'swallowtail', sizePx: 48 },
  { id: 'sw-5', baseX: 64, baseY: 70, ampX: 12, ampY: 7, speed: 1.2, phaseOffset: 0.9, kind: 'morpho', sizePx: 45 },
  { id: 'sw-6', baseX: 52, baseY: 48, ampX: 16, ampY: 5, speed: 1.3, phaseOffset: 2.2, kind: 'rosewing', sizePx: 42 },
];

const PETAL_COLORS = [
  { color: '#fde047', accent: '#f59e0b' }, // Golden dã quỳ
  { color: '#fbcfe8', accent: '#f472b6' }, // Sakura pink
  { color: '#fffbeb', accent: '#fde68a' }, // Daisy cream
  { color: '#fed7aa', accent: '#fb923c' }, // Peach marigold
  { color: '#e9d5ff', accent: '#c084fc' }, // Sim violet
];

const FLOATING_PETALS: FloatingPetalSpec[] = Array.from({ length: 34 }).map(
  (_, idx) => {
    const pal = PETAL_COLORS[idx % PETAL_COLORS.length];
    return {
      id: `petal-${idx}`,
      startX: (idx * 29) % 100,
      startY: (idx * 37) % 100,
      speedY: 4.2 + (idx % 5) * 1.15,
      speedX: 2.8 + (idx % 4) * 1.0,
      swayAmp: 3.2 + (idx % 3) * 1.4,
      swayFreq: 0.9 + (idx % 4) * 0.35,
      rotSpeed: 38 + (idx % 5) * 18,
      size: 11 + (idx % 4) * 3,
      color: pal.color,
      accent: pal.accent,
      phase: idx * 0.77,
      extraOnly: idx >= 20,
    };
  },
);

const SUN_SPARKLES: SunSparkleSpec[] = Array.from({ length: 28 }).map(
  (_, idx) => ({
    id: `spark-${idx}`,
    x: 12 + ((idx * 31) % 82),
    y: 8 + ((idx * 23) % 74),
    size: 7 + (idx % 4) * 4,
    speed: 1.4 + (idx % 5) * 0.45,
    phase: idx * 0.93,
    extraOnly: idx >= 18,
  }),
);

// Subtle highland light rain streaks & road puddle ripples
const RAIN_STREAKS = Array.from({ length: 64 }).map((_, idx) => ({
  id: `rain-${idx}`,
  startX: ((idx * 17.3) % 116) - 8,
  startY: (idx * 23.7) % 100,
  speedY: 76 + (idx % 5) * 14,
  lengthPx: 14 + (idx % 4) * 5,
  opacity: 0.28 + (idx % 4) * 0.11,
  widthPx: idx % 3 === 0 ? 1.5 : 1.1,
}));

const RAIN_RIPPLES = [40, 47, 54, 61, 68, 75, 82, 88, 94].map((yPct, idx) => {
  const s = (yPct - 30.5) / (99 - 30.5);
  const offset = (idx % 3 - 1) * roadHalfWidthPct(yPct) * 0.42;
  return {
    id: `rip-${idx}`,
    xPct: roadCenterX(yPct) + offset,
    yPct,
    maxRx: 10 + s * 18,
    maxRy: 3 + s * 5.5,
    period: 1.55 + (idx % 4) * 0.28,
    phase: idx * 0.41,
  };
});

// Layered drifting highland morning fog ribbons
const FOG_BANDS = [
  { id: 'fog-far-1', topPct: 16, heightPct: 24, widthPct: 150, speed: 1.15, phase: 0.2, opacity: 0.56, zIndex: 170 },
  { id: 'fog-far-2', topPct: 26, heightPct: 22, widthPct: 145, speed: -0.95, phase: 2.1, opacity: 0.48, zIndex: 172 },
  { id: 'fog-mid-1', topPct: 40, heightPct: 26, widthPct: 155, speed: 1.5, phase: 1.0, opacity: 0.42, zIndex: 260 },
  { id: 'fog-mid-2', topPct: 54, heightPct: 24, widthPct: 150, speed: -1.3, phase: 3.4, opacity: 0.36, zIndex: 520 },
  { id: 'fog-near-1', topPct: 68, heightPct: 26, widthPct: 160, speed: 1.85, phase: 0.8, opacity: 0.32, zIndex: 855 },
  { id: 'fog-near-2', topPct: 80, heightPct: 24, widthPct: 160, speed: -1.65, phase: 2.7, opacity: 0.28, zIndex: 858 },
];

// Road geometry helpers defined above ROADSIDE_FLOWERS

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

// Deterministic pseudo-random generator for per-journey varied student behaviors
function seededUnit(seed: number, salt: number): number {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Precompute cumulative curve-time LUT from y=95.5% (foreground) to y=25.5% (schoolyard)
// Combines S-curve arc length (so horizontal bends don't cause unnatural speed spikes)
// with 3D perspective foreshortening (faster in foreground, gentler near distant gate).
const ROAD_LUT_STEPS = 140;
const ROAD_LUT_Y_MIN = 25.5;
const ROAD_LUT_Y_MAX = 95.5;

const ROAD_PACE_LUT: { y: number; cumTime: number }[] = (() => {
  const entries: { y: number; cumTime: number }[] = [];
  let acc = 0;
  let prevY = ROAD_LUT_Y_MAX;
  let prevX = roadCenterX(prevY);
  entries.push({ y: prevY, cumTime: 0 });

  for (let i = 1; i <= ROAD_LUT_STEPS; i++) {
    const frac = i / ROAD_LUT_STEPS;
    const y = lerp(ROAD_LUT_Y_MAX, ROAD_LUT_Y_MIN, frac);
    const x = roadCenterX(y);
    const dy = Math.abs(prevY - y);
    const dx = Math.abs(x - prevX);
    // Arc length weighted for 16:9 aspect ratio so speed along the winding curve stays smooth
    const arcLen = Math.hypot(dx * 1.45, dy);
    // Perspective depth weight: 1% screen dy covers more ground far away than up close
    const depthFrac = (y - ROAD_LUT_Y_MIN) / (ROAD_LUT_Y_MAX - ROAD_LUT_Y_MIN);
    const perspectiveWeight = 1 / (0.48 + 0.52 * depthFrac);
    acc += arcLen * perspectiveWeight;
    entries.push({ y, cumTime: acc });
    prevY = y;
    prevX = x;
  }
  return entries;
})();

function getRoadCumTimeAtY(targetY: number): number {
  const clamped = Math.max(ROAD_LUT_Y_MIN, Math.min(ROAD_LUT_Y_MAX, targetY));
  const frac = (ROAD_LUT_Y_MAX - clamped) / (ROAD_LUT_Y_MAX - ROAD_LUT_Y_MIN);
  const exactIdx = frac * ROAD_LUT_STEPS;
  const lo = Math.min(ROAD_LUT_STEPS - 1, Math.floor(exactIdx));
  const hi = lo + 1;
  return lerp(ROAD_PACE_LUT[lo].cumTime, ROAD_PACE_LUT[hi].cumTime, exactIdx - lo);
}

// Sample yPct along [startY -> endY] matching the rhythm of the winding S-curve & 3D perspective
function sampleWindingRoadY(startY: number, endY: number, u: number): number {
  const t = Math.max(0, Math.min(1, u));
  const tStart = getRoadCumTimeAtY(startY);
  const tEnd = getRoadCumTimeAtY(endY);
  const targetCum = lerp(tStart, tEnd, t);

  // Binary search in ROAD_PACE_LUT (cumTime monotonically increases as y decreases)
  let low = 0;
  let high = ROAD_LUT_STEPS;
  while (low + 1 < high) {
    const mid = (low + high) >> 1;
    if (ROAD_PACE_LUT[mid].cumTime <= targetCum) {
      low = mid;
    } else {
      high = mid;
    }
  }
  const span = ROAD_PACE_LUT[high].cumTime - ROAD_PACE_LUT[low].cumTime;
  const localT = span > 0 ? (targetCum - ROAD_PACE_LUT[low].cumTime) / span : 0;
  return lerp(ROAD_PACE_LUT[low].y, ROAD_PACE_LUT[high].y, localT);
}

function getRoadCurveFacing(yPct: number): 'left' | 'right' | 'front' {
  const xAhead = roadCenterX(yPct - 1.5);
  const xNow = roadCenterX(yPct + 1.5);
  const delta = xAhead - xNow;
  if (delta < -0.55) return 'left';
  if (delta > 0.55) return 'right';
  return 'front';
}

export const VillageStage: React.FC<VillageStageProps> = ({
  students,
  phase,
  targetIds,
  travelSeconds,
  dialogueSpeakerId,
  dialogueText,
  activeSurprise = null,
  weather = 'sunny',
  onInspectStudent,
}) => {
  const [animTime, setAnimTime] = useState(0);
  const [journeyElapsed, setJourneyElapsed] = useState(0);
  const [gateCloseProgress, setGateCloseProgress] = useState(0);
  const [walkSeed, setWalkSeed] = useState(1);
  const [surpriseSnap, setSurpriseSnap] = useState<{
    id: string;
    startProgress: number;
    startAnimTime: number;
  } | null>(null);
  const phaseStartRef = useRef<number>(performance.now());
  const prevPhaseRef = useRef<GamePhase>(phase);
  const latestAnimRef = useRef<number>(0);
  const latestElapsedRef = useRef<number>(0);

  useEffect(() => {
    if (prevPhaseRef.current !== phase) {
      prevPhaseRef.current = phase;
      phaseStartRef.current = performance.now();
      if (phase === 'idle' || phase === 'walking') {
        setJourneyElapsed(0);
        setGateCloseProgress(0);
        latestElapsedRef.current = 0;
      }
      if (phase === 'walking') {
        setWalkSeed((s) => s + 1 + Math.floor(Math.random() * 97));
      }
    }
  }, [phase]);

  useEffect(() => {
    if (!activeSurprise) {
      setSurpriseSnap(null);
      return;
    }
    const p =
      travelSeconds > 0
        ? Math.min(1, latestElapsedRef.current / travelSeconds)
        : 1;
    setSurpriseSnap({
      id: activeSurprise.id,
      startProgress: p,
      startAnimTime: latestAnimRef.current,
    });
  }, [activeSurprise?.id, travelSeconds]);

  useEffect(() => {
    let rafId = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const tSec = (now - startTime) / 1000;
      latestAnimRef.current = tSec;
      setAnimTime(tSec);

      const sincePhase = (now - phaseStartRef.current) / 1000;
      if (phase === 'walking') {
        latestElapsedRef.current = sincePhase;
        setJourneyElapsed(sincePhase);
        setGateCloseProgress(0);
      } else if (phase === 'closing') {
        const raw = Math.min(1, sincePhase / 1.42);
        // Smooth cubic ease-in-out for natural heavy wooden gate swing
        const eased =
          raw < 0.5
            ? 4 * raw * raw * raw
            : 1 - Math.pow(-2 * raw + 2, 3) / 2;
        setGateCloseProgress(eased);
      } else if (phase === 'selected') {
        setGateCloseProgress(1);
      } else {
        setGateCloseProgress(0);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [phase]);

  const targetSet = useMemo(() => new Set(targetIds), [targetIds]);

  const renderedStudents = useMemo(() => {
    const total = students.length;
    if (total === 0) return [];

    // Dynamic Chibi size scale depending on total class size:
    // Small class (1..4) -> large (1.32x); typical (12) -> 1.0x; large (24+) -> compact (0.68x..0.78x)
    const countScale =
      total <= 4
        ? 1.32
        : total <= 12
          ? 1.32 - ((total - 4) / 8) * 0.32
          : Math.max(0.66, 1.0 - (total - 12) * 0.018);

    const baseProgress =
      travelSeconds > 0 ? Math.min(1, journeyElapsed / travelSeconds) : 1;

    const lateStudents = students.filter((s) => targetSet.has(s.id));
    const onTimeStudents = students.filter((s) => !targetSet.has(s.id));

    return students.map((stu, idx) => {
      const isLateTarget = targetSet.has(stu.id);
      const lateIdx = isLateTarget
        ? lateStudents.findIndex((s) => s.id === stu.id)
        : -1;
      const onTimeIdx = !isLateTarget
        ? onTimeStudents.findIndex((s) => s.id === stu.id)
        : -1;

      let xPct = 50;
      let yPct = 76;
      let action: ChibiAction = 'idle';
      let expression: ChibiExpression = 'happy';
      let holdingFlower = false;
      let facing: 'left' | 'right' | 'front' = 'front';
      let showHeroButterfly = false;
      let showGiantFlower = false;
      let heroButterflyKind: ButterflyKind =
        BUTTERFLY_KINDS[idx % BUTTERFLY_KINDS.length];
      let heroFlowerKind: WildflowerKind =
        FLOWER_KINDS[idx % FLOWER_KINDS.length];
      let isHighlighted = false;

      if (phase === 'idle') {
        // Arrange neatly in staggered rows along the winding road & meadow so no Chibi overlaps another or the bottom dock
        const cols =
          total <= 4 ? total : total <= 8 ? 4 : total <= 15 ? 5 : 6;
        const totalRows = Math.max(1, Math.ceil(total / cols));
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        const rowCount =
          row === totalRows - 1 ? total - row * cols : cols;
        yPct =
          totalRows === 1
            ? 66
            : lerp(totalRows >= 3 ? 47 : 52, 74, row / (totalRows - 1));
        const maxSpread =
          rowCount <= 1 ? 0 : Math.min(76, Math.max(22, (rowCount - 1) * 16));
        const spread =
          rowCount > 1 ? (col / (rowCount - 1) - 0.5) * maxSpread : 0;
        const rowStagger = totalRows > 1 ? (row % 2 === 0 ? -2.2 : 2.2) : 0;
        const centerAnchor = roadCenterX(yPct) * 0.45 + 50 * 0.55;
        xPct = Math.max(8, Math.min(92, centerAnchor + spread + rowStagger));
        action = 'idle';
        expression = idx % 3 === 0 ? 'waving' : 'happy';
      } else if (phase === 'walking') {
        const isSurpriseStudent = activeSurprise?.affectedStudentId === stu.id;
        const r1 = seededUnit(walkSeed, idx * 13 + 1);
        const r2 = seededUnit(walkSeed, idx * 13 + 2);
        const r3 = seededUnit(walkSeed, idx * 13 + 3);
        const r4 = seededUnit(walkSeed, idx * 13 + 4);
        const r5 = seededUnit(walkSeed, idx * 13 + 5);
        const r6 = seededUnit(walkSeed, idx * 13 + 6);
        const hasCameraGreet = r5 > 0.46;
        const cameraGreetAction: ChibiAction =
          r6 >= 0.45 ? 'wave_greet' : 'bow_greet';

        let progress = baseProgress;
        const isManualGreetTarget = Boolean(
          activeSurprise &&
            (activeSurprise.greetStudentIds?.includes(stu.id) ||
              (activeSurprise.type === 'teacher_greet' &&
                activeSurprise.affectedStudentId === stu.id)),
        );
        const hasSnap = Boolean(
          activeSurprise &&
            surpriseSnap &&
            surpriseSnap.id === activeSurprise.id,
        );
        const surpriseElapsed =
          hasSnap && surpriseSnap
            ? Math.max(0, animTime - surpriseSnap.startAnimTime)
            : 99;
        if (isManualGreetTarget && hasSnap && surpriseSnap) {
          if (surpriseElapsed < 2.95) {
            progress = surpriseSnap.startProgress;
          } else if (surpriseElapsed < 3.8) {
            const blendRaw = (surpriseElapsed - 2.95) / 0.85;
            const smooth = blendRaw * blendRaw * (3 - 2 * blendRaw);
            progress = lerp(surpriseSnap.startProgress, baseProgress, smooth);
          }
        }

        if (!isLateTarget) {
          // On-time students follow the winding S-curve rhythm, with ~60% randomly pausing briefly to pick a flower or chase a butterfly before reaching the gate
          const sprintBoost =
            activeSurprise?.type === 'quick_sprint' && isSurpriseStudent
              ? 0.16
              : 0;
          const arriveProgress = Math.max(
            0.46,
            0.62 + r1 * 0.24 - sprintBoost,
          );
          const startY = 93 - (onTimeIdx % 3) * 3.8;
          const endY = 26 + (onTimeIdx % 2) * 2.4;
          const hwBaseLane = ((onTimeIdx % 5) - 2) / 2.6;

          const hasPlayfulStop = r2 > 0.38;
          const stopKind: 'pick_flower' | 'catch_butterfly' =
            r3 > 0.48 ? 'pick_flower' : 'catch_butterfly';
          const stopSide = r4 > 0.5 ? 1 : -1;
          const stopStartU = 0.24 + r1 * 0.24; // along normalized progress
          const stopDurU = 0.15 + r3 * 0.05;
          const stopPauseProgress = stopStartU * arriveProgress;
          const stopResumeProgress = Math.min(
            arriveProgress - 0.08,
            (stopStartU + stopDurU) * arriveProgress,
          );

          if (progress >= arriveProgress) {
            const yardSpread =
              onTimeStudents.length > 1
                ? (onTimeIdx / Math.max(1, onTimeStudents.length - 1) - 0.5) * 38
                : 0;
            const sideShift = yardSpread >= 0 ? yardSpread + 3 : yardSpread - 3;
            xPct = 50 + sideShift;
            yPct = 26 + (onTimeIdx % 2) * 2.5;
            action = 'inside_yard';
            expression = 'waving';
            holdingFlower = hasPlayfulStop && stopKind === 'pick_flower';
          } else if (
            hasPlayfulStop &&
            progress >= stopPauseProgress &&
            progress < stopResumeProgress
          ) {
            // Brief playful stop on the roadside curve to pick a flower or catch a butterfly
            const localT =
              (progress - stopPauseProgress) /
              Math.max(0.01, stopResumeProgress - stopPauseProgress);
            const curveU = stopPauseProgress / arriveProgress;
            yPct = sampleWindingRoadY(startY, endY, curveU);
            const cx = roadCenterX(yPct);
            const hw = roadHalfWidthPct(yPct);
            const edgeBlend = Math.sin(localT * Math.PI); // step toward flowerbank and back
            const driftX =
              stopKind === 'catch_butterfly'
                ? Math.sin(animTime * 3.4 + idx) * 2.4
                : 0;
            xPct =
              cx +
              lerp(hwBaseLane * hw * 0.72, stopSide * hw * 0.98, edgeBlend) +
              driftX;
            action = stopKind;
            expression = stopKind === 'pick_flower' ? 'happy' : 'curious';
            holdingFlower = stopKind === 'pick_flower';
            showHeroButterfly = stopKind === 'catch_butterfly';
            facing = stopSide < 0 ? 'left' : 'right';
          } else {
            // Remap walking time outside the stop pause so motion resumes smoothly along the S-curve
            const rawWalkU =
              hasPlayfulStop && progress >= stopResumeProgress
                ? (progress - (stopResumeProgress - stopPauseProgress)) /
                  Math.max(
                    0.1,
                    arriveProgress - (stopResumeProgress - stopPauseProgress),
                  )
                : progress /
                  Math.max(
                    0.1,
                    hasPlayfulStop
                      ? arriveProgress - (stopResumeProgress - stopPauseProgress)
                      : arriveProgress,
                  );

            const curvedU = Math.max(0, Math.min(1, rawWalkU));
            yPct = sampleWindingRoadY(startY, endY, curvedU);
            const hw = roadHalfWidthPct(yPct);
            const stepWave = Math.sin(animTime * 3.2 + idx) * 0.4;
            xPct = roadCenterX(yPct) + hwBaseLane * hw * 0.72 + stepWave;
            const inCameraZone = yPct >= 67 && yPct <= 82;
            if (hasCameraGreet && inCameraZone) {
              action = cameraGreetAction;
              expression =
                cameraGreetAction === 'wave_greet' ? 'waving' : 'happy';
              facing = 'front';
            } else {
              action = 'run';
              expression =
                activeSurprise?.type === 'butterfly_swarm' && isSurpriseStudent
                  ? 'surprised'
                  : 'running';
              facing = getRoadCurveFacing(yPct);
            }
            holdingFlower =
              hasPlayfulStop &&
              stopKind === 'pick_flower' &&
              progress >= stopResumeProgress;
          }
        } else {
          // Target late student(s): randomly pick flowers & chase butterflies along the S-curve flowerbanks
          const sideSign = r1 > 0.5 ? 1 : -1;
          const secondSide = r2 > 0.5 ? -sideSign : sideSign;
          const firstIsFlower = r3 > 0.45;
          const firstAction: ChibiAction = firstIsFlower
            ? 'pick_flower'
            : 'catch_butterfly';
          const secondAction: ChibiAction = firstIsFlower
            ? 'catch_butterfly'
            : 'pick_flower';

          const bankSpreadFactor =
            lateStudents.length > 1
              ? (lateIdx / (lateStudents.length - 1) - 0.5) * 1.85
              : sideSign * 0.95;

          const startY = 93 - (lateIdx % 2) * 3;
          const midStop1Y = 69 - r4 * 7;
          const midStop2Y = 52 - r2 * 4.5;
          const endWalkY = 44.5;

          const t1Start = 0.16 + r1 * 0.08;
          const t1End = t1Start + 0.25 + r2 * 0.06;
          const tMove2 = t1End + 0.1;
          const t2End = Math.min(0.88, tMove2 + 0.24 + r3 * 0.06);

          if (progress < t1Start) {
            // Walk smoothly up the first winding curve to the roadside flowerbank
            const u = progress / t1Start;
            yPct = sampleWindingRoadY(startY, midStop1Y, u);
            const cx = roadCenterX(yPct);
            const hw = roadHalfWidthPct(yPct);
            xPct = cx + bankSpreadFactor * hw * lerp(0.4, 0.92, u);
            const inCameraZone = yPct >= 68 && yPct <= 82;
            if (hasCameraGreet && inCameraZone) {
              action = cameraGreetAction;
              expression =
                cameraGreetAction === 'wave_greet' ? 'waving' : 'happy';
              facing = 'front';
            } else {
              action = 'run';
              expression = 'happy';
              facing = getRoadCurveFacing(yPct);
            }
          } else if (progress < t1End) {
            // First random playful stop (hái hoa OR bắt bướm)
            yPct = midStop1Y;
            const cx = roadCenterX(yPct);
            const hw = roadHalfWidthPct(yPct);
            const sway =
              firstAction === 'catch_butterfly'
                ? Math.sin(animTime * 3.1 + lateIdx) * 3.6
                : Math.sin(animTime * 1.4 + lateIdx) * 0.8;
            xPct = cx + bankSpreadFactor * hw * 0.94 + sway;
            action = firstAction;
            expression = firstAction === 'pick_flower' ? 'happy' : 'curious';
            holdingFlower = firstIsFlower;
            showHeroButterfly = !firstIsFlower;
            facing =
              firstAction === 'catch_butterfly'
                ? sway >= 0
                  ? 'right'
                  : 'left'
                : sideSign < 0
                  ? 'left'
                  : 'right';
          } else if (progress < tMove2) {
            // Stroll along the winding curve to the next flower/butterfly spot
            const u = (progress - t1End) / Math.max(0.01, tMove2 - t1End);
            yPct = sampleWindingRoadY(midStop1Y, midStop2Y, u);
            const cx = roadCenterX(yPct);
            const hw = roadHalfWidthPct(yPct);
            xPct =
              cx +
              lerp(bankSpreadFactor, secondSide * 0.85, u) * hw * 0.88;
            action = 'run';
            expression = 'happy';
            holdingFlower = firstIsFlower;
            facing = getRoadCurveFacing(yPct);
          } else if (progress < t2End) {
            // Second random playful stop (opposite activity)
            yPct = midStop2Y;
            const cx = roadCenterX(yPct);
            const hw = roadHalfWidthPct(yPct);
            const sway =
              secondAction === 'catch_butterfly'
                ? Math.sin(animTime * 2.9 + lateIdx * 1.7) * 4.0
                : Math.sin(animTime * 1.5 + lateIdx) * 0.8;
            const spread2 =
              lateStudents.length > 1
                ? (lateIdx / (lateStudents.length - 1) - 0.5) * 1.75
                : secondSide * 0.9;
            xPct = cx + spread2 * hw * 0.9 + sway;
            action = secondAction;
            expression = secondAction === 'pick_flower' ? 'happy' : 'curious';
            holdingFlower = true;
            showHeroButterfly = secondAction === 'catch_butterfly';
            facing =
              secondAction === 'catch_butterfly'
                ? sway >= 0
                  ? 'right'
                  : 'left'
                : secondSide < 0
                  ? 'left'
                  : 'right';
          } else {
            // Final unhurried amble toward the gate before the bell rings
            const u = (progress - t2End) / Math.max(0.01, 1 - t2End);
            yPct = sampleWindingRoadY(midStop2Y, endWalkY, u);
            const cx = roadCenterX(yPct);
            const hw = roadHalfWidthPct(yPct);
            const spreadEnd =
              lateStudents.length > 1
                ? (lateIdx / (lateStudents.length - 1) - 0.5) * 1.6
                : secondSide * 0.72;
            xPct = cx + spreadEnd * hw * 0.82;
            action = u < 0.75 ? 'run' : 'idle';
            expression = u < 0.75 ? 'curious' : 'thinking';
            holdingFlower = true;
            showHeroButterfly = true;
            facing = u < 0.75 ? getRoadCurveFacing(yPct) : 'front';
          }

          if (activeSurprise) {
            if (
              activeSurprise.type === 'giant_flower_find' &&
              isSurpriseStudent
            ) {
              expression = 'surprised';
              action = 'pick_flower';
              showGiantFlower = true;
            } else if (
              activeSurprise.type === 'butterfly_swarm' ||
              activeSurprise.type === 'wind_petals'
            ) {
              expression = isSurpriseStudent ? 'surprised' : 'curious';
              showHeroButterfly = true;
            }
          }
        }

        if (
          isManualGreetTarget &&
          action !== 'inside_yard' &&
          surpriseElapsed < 3.25
        ) {
          const manualGreetAction: ChibiAction =
            activeSurprise?.greetActions?.[stu.id] ||
            (r6 >= 0.5 ? 'wave_greet' : 'bow_greet');
          action = manualGreetAction;
          expression = manualGreetAction === 'wave_greet' ? 'waving' : 'happy';
          facing = 'front';
        }
      } else if (phase === 'closing') {
        if (!isLateTarget) {
          const yardSpread =
            onTimeStudents.length > 1
              ? (onTimeIdx / Math.max(1, onTimeStudents.length - 1) - 0.5) * 38
              : 0;
          const sideShift = yardSpread >= 0 ? yardSpread + 3 : yardSpread - 3;
          xPct = 50 + sideShift;
          yPct = 26 + (onTimeIdx % 2) * 2.5;
          action = 'inside_yard';
          expression = 'waving';
        } else {
          const spread =
            lateStudents.length > 1
              ? (lateIdx / (lateStudents.length - 1) - 0.5) * Math.min(54, lateStudents.length * 14)
              : 0;
          yPct = 48;
          xPct = roadCenterX(yPct) + spread;
          action = 'idle';
          expression = 'surprised';
          holdingFlower = true;
        }
      } else if (phase === 'selected') {
        if (!isLateTarget) {
          const yardSpread =
            onTimeStudents.length > 1
              ? (onTimeIdx / Math.max(1, onTimeStudents.length - 1) - 0.5) * 38
              : 0;
          const sideShift = yardSpread >= 0 ? yardSpread + 3 : yardSpread - 3;
          xPct = 50 + sideShift;
          yPct = 26 + (onTimeIdx % 2) * 2.5;
          action = 'inside_yard';
          expression = 'waving';
        } else {
          const maxPerRow = 4;
          const totalLateRows = Math.max(1, Math.ceil(lateStudents.length / maxPerRow));
          const row = Math.floor(lateIdx / maxPerRow);
          const col = lateIdx % maxPerRow;
          const itemsInRow = Math.min(
            maxPerRow,
            lateStudents.length - row * maxPerRow,
          );
          const spread =
            itemsInRow > 1
              ? (col / (itemsInRow - 1) - 0.5) * Math.min(74, itemsInRow * 21)
              : 0;
          yPct = totalLateRows === 1 ? 68 : 60 + row * 15;
          xPct = Math.max(10, Math.min(90, roadCenterX(yPct) * 0.3 + 50 * 0.7 + spread));
          action = 'late_caught';
          expression = lateIdx % 2 === 0 ? 'sad' : 'thinking';
          holdingFlower = true;
          isHighlighted = true;
        }
      }

      // True 3D perspective depth scaling across the extended road:
      // Distant students near/inside schoolyard (~45px) -> foreground students (~220px)
      const depthNorm = Math.max(0, Math.min(1, (yPct - 24) / (95.5 - 24)));
      const perspectiveCurve = Math.pow(depthNorm, 1.24);
      const baseSize = isHighlighted
        ? 140 + perspectiveCurve * 58
        : (45 + perspectiveCurve * 172) * countScale;
      const lateCountScale =
        isHighlighted && lateStudents.length > 2
          ? Math.max(0.74, 1 - (lateStudents.length - 2) * 0.07)
          : 1;
      const sizePx = Math.round(
        Math.max(46, Math.min(220, baseSize * lateCountScale)),
      );

      return {
        student: stu,
        xPct,
        yPct,
        sizePx,
        action,
        expression,
        holdingFlower,
        facing,
        showHeroButterfly,
        showGiantFlower,
        heroButterflyKind,
        heroFlowerKind,
        isHighlighted,
        zIndex: Math.round(yPct * 10) + (isHighlighted ? 200 : 0),
      };
    });
  }, [
    students,
    phase,
    targetSet,
    travelSeconds,
    journeyElapsed,
    animTime,
    activeSurprise,
    walkSeed,
    surpriseSnap,
  ]);

  const bellSwingDeg =
    phase === 'closing'
      ? Math.sin(animTime * 25) * 28
      : Math.sin(animTime * 1.9) * 2.5;

  const isWindSurprise = activeSurprise?.type === 'wind_petals';
  const isSunSurprise = activeSurprise?.type === 'golden_sunbeam';
  const isSwarmSurprise = activeSurprise?.type === 'butterfly_swarm';
  const isLightRain = weather === 'light_rain';
  const isFoggy = weather === 'foggy';
  const isSunny = weather === 'sunny';

  return (
    <div className="absolute inset-0 z-0 isolate overflow-hidden bg-gradient-to-b from-[#cbe9f9] via-[#e2f3d8] to-[#b9dc95] select-none">
      {/* 1. Generated Soft Pastel 2D Ca Dong Morning Village Backdrop */}
      <img
        src="/src/assets/images/cadong_village_morning_1795365225340.jpg"
        alt="Bản làng vùng cao Ca Dong buổi sáng sớm"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none transition-all duration-700"
        style={{
          filter: isLightRain
            ? 'saturate(0.84) brightness(0.92) contrast(1.03)'
            : isFoggy
              ? 'saturate(0.8) brightness(1.04) contrast(0.92)'
              : 'none',
        }}
      />

      {/* 2. Dynamic Weather Atmosphere & Golden Sunlight Layer */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        style={{
          background: isLightRain
            ? 'linear-gradient(180deg, rgba(71, 102, 138, 0.34) 0%, rgba(114, 146, 174, 0.2) 45%, rgba(79, 118, 104, 0.18) 100%)'
            : isFoggy
              ? 'linear-gradient(180deg, rgba(235, 245, 249, 0.56) 0%, rgba(241, 248, 250, 0.38) 42%, rgba(226, 238, 234, 0.16) 100%)'
              : isSunSurprise
                ? 'radial-gradient(circle at 80% 14%, rgba(255, 240, 170, 0.65) 0%, rgba(255, 232, 165, 0.18) 45%, rgba(254, 215, 170, 0.15) 100%)'
                : 'radial-gradient(circle at 80% 12%, rgba(255, 246, 198, 0.48) 0%, rgba(255, 246, 198, 0) 42%), linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(254, 243, 199, 0.12) 48%, rgba(164, 212, 132, 0.22) 100%)',
        }}
      />

      {/* Diagonal Sunbeam Shafts Streaming Across the Village Road (strong in Sunny, soft/diffused in Foggy, faint sun-shower in Rain) */}
      {(isSunny || isSunSurprise || isFoggy) && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          {[
            { left: '46%', width: '16%', opacity: 0.16, phase: 0.0 },
            { left: '62%', width: '22%', opacity: 0.22, phase: 1.4 },
            { left: '78%', width: '14%', opacity: 0.15, phase: 2.6 },
          ].map((ray, i) => {
            const weatherFactor = isFoggy && !isSunSurprise ? 0.35 : 1;
            const pulse =
              (ray.opacity + (isSunSurprise ? 0.16 : 0)) *
              weatherFactor *
              (0.72 + 0.28 * Math.sin(animTime * 1.1 + ray.phase));
            return (
              <div
                key={i}
                className="absolute -top-24 h-[145%] origin-top-right"
                style={{
                  left: ray.left,
                  width: ray.width,
                  transform: 'rotate(24deg)',
                  background:
                    'linear-gradient(180deg, rgba(255, 249, 210, 0.9) 0%, rgba(254, 240, 138, 0.35) 55%, rgba(254, 240, 138, 0) 100%)',
                  opacity: pulse,
                }}
              />
            );
          })}
        </div>
      )}

      {/* 3. Visibly Serpentine, Softly Feathered S-Curve Highland Path */}
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="roadDirtSoft" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f3e6d0" stopOpacity="0.92" />
            <stop offset="45%" stopColor="#e8ceaa" stopOpacity="0.96" />
            <stop offset="100%" stopColor="#dab98c" stopOpacity="0.98" />
          </linearGradient>
          <linearGradient id="roadCenterGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#faf1e1" stopOpacity="0.58" />
            <stop offset="60%" stopColor="#f6e3c6" stopOpacity="0.52" />
            <stop offset="100%" stopColor="#edd3ad" stopOpacity="0.45" />
          </linearGradient>
          <linearGradient id="meadowTintSoft" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(167, 215, 130, 0)" />
            <stop offset="42%" stopColor="rgba(143, 200, 110, 0.3)" />
            <stop offset="100%" stopColor="rgba(116, 182, 89, 0.6)" />
          </linearGradient>
          <filter id="roadSoftEdge" x="-8%" y="-5%" width="116%" height="110%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="roadFeather" x="-6%" y="-4%" width="112%" height="108%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
        </defs>

        <rect x="0" y="330" width="1600" height="570" fill="url(#meadowTintSoft)" />

        {/* Feathered Lush Mossy Road Verge */}
        <path
          d={ROAD_VERGE_PATH}
          fill="rgba(126, 184, 96, 0.56)"
          filter="url(#roadSoftEdge)"
        />

        {/* Soft Sandy Shoulder Halo */}
        <path
          d={ROAD_SHOULDER_PATH}
          fill="#d7ba8c"
          opacity="0.58"
          filter="url(#roadFeather)"
        />

        {/* Graceful Velvety Winding S-Curve Earth Path */}
        <path
          d={ROAD_MAIN_PATH}
          fill="url(#roadDirtSoft)"
          filter="url(#roadFeather)"
        />

        {/* Sunlit Warm Center Footpath Highlight */}
        <path
          d={ROAD_HIGHLIGHT_PATH}
          fill="url(#roadCenterGlow)"
          filter="url(#roadSoftEdge)"
        />

        {/* Organic Smooth River Pebbles Following the Winding S-Curve */}
        {ROAD_PEBBLES.map((st, i) => (
          <ellipse
            key={i}
            cx={st.cx}
            cy={st.cy}
            rx={st.w}
            ry={st.h}
            transform={`rotate(${st.rot}, ${st.cx}, ${st.cy})`}
            fill="#f7ebd6"
            opacity="0.54"
            stroke="#cfa97b"
            strokeWidth="1.2"
          />
        ))}
        {/* Subtle damp sheen & expanding raindrop ripples on the earth path during light rain */}
        {isLightRain && (
          <>
            <path d={ROAD_MAIN_PATH} fill="rgba(148, 179, 206, 0.18)" />
            {RAIN_RIPPLES.map((rip) => {
              const cycle = ((animTime + rip.phase) % rip.period) / rip.period;
              const rx = rip.maxRx * (0.2 + cycle * 0.8);
              const ry = rip.maxRy * (0.2 + cycle * 0.8);
              const alpha = (1 - cycle) * 0.52;
              return (
                <ellipse
                  key={rip.id}
                  cx={(rip.xPct / 100) * 1600}
                  cy={(rip.yPct / 100) * 900}
                  rx={rx}
                  ry={ry}
                  fill="none"
                  stroke="#e0f2fe"
                  strokeWidth="1.5"
                  opacity={alpha}
                />
              );
            })}
          </>
        )}
      </svg>

      {/* 4. Expanded Realistic Highland School & Characteristic Wooden Gate: TRƯỜNG PTDTBT TH&THCS LÝ TỰ TRỌNG */}
      <div
        className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          top: '3.2%',
          width: 'min(810px, 90vw)',
          zIndex: 180,
        }}
      >
        <svg viewBox="0 0 820 320" className="w-full h-auto drop-shadow-lg">
          <defs>
            <linearGradient id="schoolWallGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fffaf0" />
              <stop offset="65%" stopColor="#f9eedb" />
              <stop offset="100%" stopColor="#ebd8ba" />
            </linearGradient>
            <linearGradient id="roofTileGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#dc645c" />
              <stop offset="55%" stopColor="#c94b45" />
              <stop offset="100%" stopColor="#a83834" />
            </linearGradient>
            <linearGradient id="porchRoofGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d4554d" />
              <stop offset="100%" stopColor="#9e3531" />
            </linearGradient>
            <linearGradient id="glassPaneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="50%" stopColor="#93c5fd" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
            <linearGradient id="brassBellGrad" x1="15%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="45%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="timberPostGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7a4c2e" />
              <stop offset="42%" stopColor="#9c633e" />
              <stop offset="100%" stopColor="#5e3821" />
            </linearGradient>
            <linearGradient id="timberBeamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a66c44" />
              <stop offset="55%" stopColor="#855231" />
              <stop offset="100%" stopColor="#59351e" />
            </linearGradient>
            <radialGradient id="foliageGrad" cx="38%" cy="32%" r="68%">
              <stop offset="0%" stopColor="#86d67a" />
              <stop offset="65%" stopColor="#4f9d53" />
              <stop offset="100%" stopColor="#35723c" />
            </radialGradient>
          </defs>

          {/* Wide Sunlit Highland Schoolyard Paving & Soft Grass Border */}
          <ellipse cx="410" cy="274" rx="390" ry="38" fill="#e5d0af" opacity="0.93" />
          <ellipse cx="410" cy="268" rx="335" ry="29" fill="#f3e5cd" opacity="0.92" />
          {/* Flag-Ceremony Courtyard Inner Medallion */}
          <ellipse
            cx="410"
            cy="242"
            rx="125"
            ry="15"
            fill="#faf0de"
            stroke="#d4b990"
            strokeWidth="1.5"
            opacity="0.88"
          />

          {/* Lush Highland Trees Framing Both Sides of the Expanded School */}
          <g>
            <rect x="44" y="138" width="14" height="84" rx="5" fill="#7c543c" />
            <circle cx="51" cy="120" r="38" fill="url(#foliageGrad)" stroke="#2e6334" strokeWidth="1.5" />
            <circle cx="28" cy="138" r="24" fill="url(#foliageGrad)" stroke="#2e6334" strokeWidth="1.3" />
            <circle cx="76" cy="136" r="26" fill="url(#foliageGrad)" stroke="#2e6334" strokeWidth="1.3" />

            <rect x="762" y="138" width="14" height="84" rx="5" fill="#7c543c" />
            <circle cx="769" cy="120" r="38" fill="url(#foliageGrad)" stroke="#2e6334" strokeWidth="1.5" />
            <circle cx="744" cy="136" r="26" fill="url(#foliageGrad)" stroke="#2e6334" strokeWidth="1.3" />
            <circle cx="792" cy="138" r="24" fill="url(#foliageGrad)" stroke="#2e6334" strokeWidth="1.3" />
          </g>

          {/* Left & Right Extended Classroom Wings */}
          <g>
            {/* Left Wing */}
            <rect x="102" y="114" width="116" height="86" rx="4" fill="url(#schoolWallGrad)" stroke="#7d614d" strokeWidth="2" />
            <path d="M90 118 L122 72 L222 72 L222 118 Z" fill="url(#roofTileGrad)" stroke="#78302b" strokeWidth="2" strokeLinejoin="round" />
            <rect x="128" y="132" width="38" height="42" rx="4" fill="url(#glassPaneGrad)" stroke="#6e4a34" strokeWidth="2" />
            <line x1="147" y1="132" x2="147" y2="174" stroke="#fff8eb" strokeWidth="1.8" />
            <line x1="128" y1="153" x2="166" y2="153" stroke="#fff8eb" strokeWidth="1.8" />
            <rect x="124" y="172" width="46" height="6" rx="2" fill="#b47d56" />
            <rect x="98" y="198" width="120" height="11" rx="2" fill="#c7b299" stroke="#7d644f" strokeWidth="1.5" />

            {/* Right Wing */}
            <rect x="602" y="114" width="116" height="86" rx="4" fill="url(#schoolWallGrad)" stroke="#7d614d" strokeWidth="2" />
            <path d="M598 72 L698 72 L730 118 L598 118 Z" fill="url(#roofTileGrad)" stroke="#78302b" strokeWidth="2" strokeLinejoin="round" />
            <rect x="654" y="132" width="38" height="42" rx="4" fill="url(#glassPaneGrad)" stroke="#6e4a34" strokeWidth="2" />
            <line x1="673" y1="132" x2="673" y2="174" stroke="#fff8eb" strokeWidth="1.8" />
            <line x1="654" y1="153" x2="692" y2="153" stroke="#fff8eb" strokeWidth="1.8" />
            <rect x="650" y="172" width="46" height="6" rx="2" fill="#b47d56" />
            <rect x="602" y="198" width="120" height="11" rx="2" fill="#c7b299" stroke="#7d644f" strokeWidth="1.5" />
          </g>

          {/* Main Central School Hall */}
          <rect x="208" y="194" width="404" height="16" rx="3" fill="#c7b299" stroke="#7d644f" strokeWidth="1.8" />
          <rect x="368" y="200" width="84" height="8" rx="2" fill="#e2d2bc" stroke="#7d644f" strokeWidth="1.3" />
          <rect x="360" y="207" width="100" height="8" rx="2" fill="#d3bfa4" stroke="#7d644f" strokeWidth="1.3" />

          <rect
            x="212"
            y="88"
            width="396"
            height="108"
            rx="6"
            fill="url(#schoolWallGrad)"
            stroke="#7d614d"
            strokeWidth="2.2"
          />
          <rect x="213" y="89" width="394" height="10" fill="rgba(120, 82, 58, 0.16)" />

          {/* Multi-Pane Classroom Windows with Shutters & Flower Boxes */}
          {[236, 300, 476, 540].map((wx) => (
            <g key={wx}>
              <rect x={wx - 6} y="114" width="6" height="46" rx="2" fill="#9c6b49" stroke="#66422b" strokeWidth="1.2" />
              <rect x={wx + 42} y="114" width="6" height="46" rx="2" fill="#9c6b49" stroke="#66422b" strokeWidth="1.2" />
              <rect
                x={wx}
                y="112"
                width="42"
                height="48"
                rx="4"
                fill="url(#glassPaneGrad)"
                stroke="#6e4a34"
                strokeWidth="2.1"
              />
              <line x1={wx + 21} y1="112" x2={wx + 21} y2="160" stroke="#fff8eb" strokeWidth="1.9" />
              <line x1={wx} y1="136" x2={wx + 42} y2="136" stroke="#fff8eb" strokeWidth="1.9" />
              <polygon points={`${wx + 5},116 ${wx + 15},116 ${wx + 7},134 ${wx + 5},130`} fill="rgba(255,255,255,0.55)" />
              <rect x={wx - 4} y="158" width="50" height="6.5" rx="2" fill="#b47d56" stroke="#66422b" strokeWidth="1.2" />
              <ellipse cx={wx + 9} cy="157" rx="6.5" ry="3.8" fill="#5da657" />
              <ellipse cx={wx + 21} cy="156" rx="7.5" ry="4.2" fill="#4d9448" />
              <ellipse cx={wx + 33} cy="157" rx="6.5" ry="3.8" fill="#5da657" />
              <circle cx={wx + 10} cy="155" r="2.1" fill="#fde047" />
              <circle cx={wx + 21} cy="154" r="2.3" fill="#f472b6" />
              <circle cx={wx + 32} cy="155" r="2.1" fill="#fde047" />
            </g>
          ))}

          {/* Arched Double Wooden Classroom Doors */}
          <path
            d="M376 196 L376 128 Q410 106 444 128 L444 196 Z"
            fill="#8b593c"
            stroke="#593622"
            strokeWidth="2.2"
          />
          <line x1="410" y1="130" x2="410" y2="196" stroke="#593622" strokeWidth="2" />
          <path d="M382 128 Q410 112 438 128 Z" fill="#bae6fd" stroke="#593622" strokeWidth="1.5" />
          <circle cx="404" cy="164" r="2.3" fill="#facc15" />
          <circle cx="416" cy="164" r="2.3" fill="#facc15" />

          {/* Covered Front Porch Overhang & Warm Timber Columns */}
          <path
            d="M352 116 L410 92 L468 116 Z"
            fill="url(#porchRoofGrad)"
            stroke="#78302b"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {[226, 356, 464, 594].map((cx) => (
            <g key={cx}>
              <rect x={cx - 4} y="96" width="8" height="100" fill="#a6704c" stroke="#66422b" strokeWidth="1.4" />
              <rect x={cx - 6} y="190" width="12" height="6" rx="1.5" fill="#8c5b3c" />
            </g>
          ))}

          {/* Multi-Layered Tiled Terracotta Main Roof */}
          <path
            d="M180 96 L234 28 L586 28 L640 96 Z"
            fill="url(#roofTileGrad)"
            stroke="#78302b"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          {[42, 56, 70, 84].map((ry) => (
            <line
              key={ry}
              x1={222 - (ry - 28) * 0.62}
              y1={ry}
              x2={598 + (ry - 28) * 0.62}
              y2={ry}
              stroke="rgba(255, 224, 210, 0.38)"
              strokeWidth="1.6"
            />
          ))}
          {[260, 310, 360, 410, 460, 510, 560].map((rx) => (
            <line
              key={rx}
              x1={rx}
              y1="30"
              x2={rx + (rx - 410) * 0.14}
              y2="94"
              stroke="rgba(110, 35, 30, 0.28)"
              strokeWidth="1.5"
            />
          ))}
          <rect x="230" y="24" width="360" height="7" rx="3.5" fill="#b93e38" stroke="#78302b" strokeWidth="1.8" />

          {/* Schoolyard Flagpole & Fluttering Vietnamese Flag */}
          <line x1="410" y1="26" x2="410" y2="2" stroke="#6e5444" strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="410" cy="3" r="3" fill="#facc15" />
          <g transform={`translate(412, 4) skewY(${Math.sin(animTime * 4) * 3})`}>
            <rect x="0" y="0" width="38" height="23" rx="2" fill="#dc2626" />
            <polygon
              points="19,4.6 21,10.5 27.2,10.5 22.2,14 24,19.8 19,16.2 14,19.8 15.8,14 10.8,10.5 17,10.5"
              fill="#facc15"
            />
          </g>

          {/* Wide Wooden Courtyard Fence & Flowering Shrubs */}
          <g>
            {/* Rustic Highland Timber Fence */}
            <g fill="url(#timberBeamGrad)" stroke="#54331d" strokeWidth="1.4">
              <rect x="52" y="232" width="218" height="7" rx="2.5" />
              <rect x="52" y="252" width="218" height="7" rx="2.5" />
              <rect x="550" y="232" width="218" height="7" rx="2.5" />
              <rect x="550" y="252" width="218" height="7" rx="2.5" />
            </g>
            <g fill="#a97048" stroke="#54331d" strokeWidth="1.4">
              {[60, 88, 116, 144, 172, 200, 228, 256, 564, 592, 620, 648, 676, 704, 732, 760].map((fx) => (
                <path key={fx} d={`M${fx},225 L${fx + 5},219 L${fx + 10},225 L${fx + 10},272 L${fx},272 Z`} />
              ))}
            </g>
            <ellipse cx="145" cy="270" rx="72" ry="12" fill="url(#foliageGrad)" stroke="#2e6334" strokeWidth="1.2" />
            <ellipse cx="675" cy="270" rx="72" ry="12" fill="url(#foliageGrad)" stroke="#2e6334" strokeWidth="1.2" />
          </g>

          {/* CHARACTERISTIC HIGHLAND WOODEN SCHOOL GATE: Timber Pillars, Shingle Caps, Overhead Wood Beam */}
          {/* Overhead Carved Timber Crossbeam Connecting the Two Gate Posts */}
          <rect
            x="252"
            y="184"
            width="316"
            height="14"
            rx="4"
            fill="url(#timberBeamGrad)"
            stroke="#4a2b18"
            strokeWidth="2"
          />
          {/* Left & Right Carved Wooden Gate Posts */}
          {[268, 520].map((px) => (
            <g key={px}>
              {/* Stone Plinth Base */}
              <rect x={px - 4} y="274" width="40" height="14" rx="3" fill="#a89984" stroke="#5e5040" strokeWidth="1.8" />
              {/* Main Carved Timber Pillar */}
              <rect
                x={px}
                y="176"
                width="32"
                height="100"
                rx="3"
                fill="url(#timberPostGrad)"
                stroke="#4a2b18"
                strokeWidth="2.2"
              />
              {/* Subtle Wood Grain Lines */}
              <line x1={px + 9} y1="184" x2={px + 9} y2="270" stroke="rgba(74, 43, 24, 0.35)" strokeWidth="1.2" />
              <line x1={px + 22} y1="188" x2={px + 22} y2="268" stroke="rgba(255, 224, 185, 0.2)" strokeWidth="1.2" />
              {/* Traditional Pitched Wooden Shingle Mini-Roof Over Each Gate Pillar */}
              <path
                d={`M${px - 10} 178 L${px + 16} 156 L${px + 42} 178 Z`}
                fill="#b9483e"
                stroke="#5e251e"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d={`M${px - 4} 178 L${px + 16} 161 L${px + 36} 178`}
                fill="none"
                stroke="#f5b7aa"
                strokeWidth="1.5"
              />
              {/* Warm Wooden Gate Lantern Hanging Below Shingle Eave */}
              <circle cx={px + 16} cy="198" r="5" fill="#fef08a" stroke="#5e3821" strokeWidth="1.4" />
            </g>
          ))}

          {/* 3D Brass School Bell Hanging from Wooden Bracket on Left Timber Post */}
          <g>
            <path d="M268 206 L242 206 L242 214" fill="none" stroke="#5e3821" strokeWidth="3.6" strokeLinecap="round" />
            <g transform={`translate(242, 214) rotate(${bellSwingDeg}, 0, 0)`}>
              {phase === 'closing' && (
                <g fill="none" stroke="#f59e0b" strokeWidth="2.8" strokeLinecap="round">
                  <path
                    d="M-22 8 Q-32 18 -22 28"
                    opacity={0.48 + 0.5 * Math.abs(Math.sin(animTime * 16))}
                  />
                  <path
                    d="M-31 2 Q-44 18 -31 34"
                    opacity={0.36 + 0.55 * Math.abs(Math.cos(animTime * 16))}
                  />
                  <path
                    d="M22 8 Q32 18 22 28"
                    opacity={0.48 + 0.5 * Math.abs(Math.sin(animTime * 16))}
                  />
                  <path
                    d="M31 2 Q44 18 31 34"
                    opacity={0.36 + 0.55 * Math.abs(Math.cos(animTime * 16))}
                  />
                </g>
              )}
              <path
                d="M-13 22 C-13 5, 13 5, 13 22 L18 29 L-18 29 Z"
                fill="url(#brassBellGrad)"
                stroke="#78350f"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <ellipse cx="0" cy="29" rx="17" ry="3.2" fill="#b45309" opacity="0.52" />
              <circle cx="0" cy="31" r="4.5" fill="#92400e" />
              <path d="M0 35 Q2 47 -1 56" fill="none" stroke="#a16207" strokeWidth="1.9" strokeLinecap="round" />
            </g>
          </g>

          {/* Wooden-Framed School Gate Signboard */}
          <rect
            x="228"
            y="148"
            width="364"
            height="38"
            rx="8"
            fill="#b91c1c"
            stroke="#855231"
            strokeWidth="4.2"
          />
          <rect
            x="233"
            y="153"
            width="354"
            height="28"
            rx="5"
            fill="none"
            stroke="#fde68a"
            strokeWidth="1.8"
          />
          <text
            x="410"
            y="172"
            textAnchor="middle"
            fill="#fffbeb"
            fontSize="15.2"
            fontWeight="800"
            fontFamily="Outfit, Plus Jakarta Sans, sans-serif"
            letterSpacing="0.5"
          >
            TRƯỜNG PTDTBT TH&amp;THCS LÝ TỰ TRỌNG
          </text>
        </svg>
      </div>

      {/* 5. Students Inside Schoolyard (behind closing gate wings) */}
      {renderedStudents
        .filter((item) => item.action === 'inside_yard')
        .map((item) => (
          <div
            key={item.student.id}
            onClick={() => onInspectStudent?.(item.student)}
            title="Nhấn để xem toàn thân Chibi & các biểu cảm"
            className="absolute -translate-x-1/2 -translate-y-[88%] cursor-pointer transition-transform hover:scale-105"
            style={{
              left: `${item.xPct}%`,
              top: `${item.yPct}%`,
              width: `${item.sizePx}px`,
              height: `${Math.round(item.sizePx * 1.28)}px`,
              zIndex: 210,
            }}
          >
            <ChibiCharacterSVG
              student={item.student}
              expression={item.expression}
              action={item.action}
              holdingFlower={item.holdingFlower}
              animTime={animTime}
              facing={item.facing}
            />
            <div className="mt-[-6px] flex flex-col items-center pointer-events-none">
              <span className="px-2 py-0.5 rounded-lg bg-white/92 border border-stone-200 text-[10px] sm:text-xs font-bold text-stone-800 shadow-sm whitespace-nowrap">
                {item.student.name}
              </span>
            </div>
          </div>
        ))}

      {/* 6. Smooth Eased Hinged Wooden School Gate Wings (matched to viewBox 0 0 820 320) */}
      <div
        className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          top: '3.2%',
          width: 'min(810px, 90vw)',
          zIndex: 250,
        }}
      >
        <svg viewBox="0 0 820 320" className="w-full h-auto">
          <defs>
            <linearGradient id="woodPlankGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#b97b4b" />
              <stop offset="55%" stopColor="#9d6338" />
              <stop offset="100%" stopColor="#7a4925" />
            </linearGradient>
          </defs>
          {(() => {
            // Smooth 3D hinged perspective swing angle: ~72 deg open -> 0 deg closed
            const swingRad = (1 - gateCloseProgress) * 1.24;
            const swingCos = Math.max(0.24, Math.cos(swingRad));
            const swingSkew = Math.sin(swingRad) * 9.5;
            const latchSparkle =
              phase === 'closing' && gateCloseProgress > 0.92
                ? (1 - (gateCloseProgress - 0.92) / 0.08) * 0.9
                : 0;

            return (
              <>
                {/* Left Swinging Wooden Door */}
                <g
                  transform={`translate(300, 200) scale(${swingCos}, 1) skewY(${-swingSkew})`}
                >
                  {/* Sweeping ground shadow */}
                  <ellipse cx="55" cy="78" rx="54" ry="5" fill="rgba(74, 43, 24, 0.22)" />
                  {/* Wooden top rail curve + solid lower plank panel */}
                  <path
                    d="M0 10 Q55 -4 110 4 L110 74 L0 74 Z"
                    fill="rgba(185, 123, 75, 0.28)"
                    stroke="#59351e"
                    strokeWidth="2.8"
                    strokeLinejoin="round"
                  />
                  {/* Upper wooden picket slats */}
                  {[16, 36, 56, 76, 96].map((bar) => (
                    <rect
                      key={bar}
                      x={bar - 4}
                      y="6"
                      width="8"
                      height="32"
                      rx="2"
                      fill="url(#woodPlankGrad)"
                      stroke="#59351e"
                      strokeWidth="1.4"
                    />
                  ))}
                  {/* Lower solid timber planks */}
                  <rect
                    x="2"
                    y="38"
                    width="106"
                    height="35"
                    rx="2"
                    fill="url(#woodPlankGrad)"
                    stroke="#59351e"
                    strokeWidth="1.8"
                  />
                  {[22, 44, 66, 88].map((seam) => (
                    <line key={seam} x1={seam} y1="39" x2={seam} y2="72" stroke="#633c22" strokeWidth="1.3" />
                  ))}
                  {/* Diagonal timber Z-brace & iron strap hinges */}
                  <line x1="4" y1="71" x2="106" y2="40" stroke="#704325" strokeWidth="4.5" strokeLinecap="round" />
                  <rect x="0" y="15" width="16" height="5" rx="1.5" fill="#44403c" />
                  <rect x="0" y="56" width="16" height="5" rx="1.5" fill="#44403c" />
                  {/* Brass latch ring */}
                  <circle cx="101" cy="48" r="4" fill="#facc15" stroke="#78350f" strokeWidth="1.3" />
                </g>

                {/* Right Swinging Wooden Door */}
                <g
                  transform={`translate(520, 200) scale(${-swingCos}, 1) skewY(${-swingSkew})`}
                >
                  <ellipse cx="55" cy="78" rx="54" ry="5" fill="rgba(74, 43, 24, 0.22)" />
                  <path
                    d="M0 10 Q55 -4 110 4 L110 74 L0 74 Z"
                    fill="rgba(185, 123, 75, 0.28)"
                    stroke="#59351e"
                    strokeWidth="2.8"
                    strokeLinejoin="round"
                  />
                  {[16, 36, 56, 76, 96].map((bar) => (
                    <rect
                      key={bar}
                      x={bar - 4}
                      y="6"
                      width="8"
                      height="32"
                      rx="2"
                      fill="url(#woodPlankGrad)"
                      stroke="#59351e"
                      strokeWidth="1.4"
                    />
                  ))}
                  <rect
                    x="2"
                    y="38"
                    width="106"
                    height="35"
                    rx="2"
                    fill="url(#woodPlankGrad)"
                    stroke="#59351e"
                    strokeWidth="1.8"
                  />
                  {[22, 44, 66, 88].map((seam) => (
                    <line key={seam} x1={seam} y1="39" x2={seam} y2="72" stroke="#633c22" strokeWidth="1.3" />
                  ))}
                  <line x1="4" y1="71" x2="106" y2="40" stroke="#704325" strokeWidth="4.5" strokeLinecap="round" />
                  <rect x="0" y="15" width="16" height="5" rx="1.5" fill="#44403c" />
                  <rect x="0" y="56" width="16" height="5" rx="1.5" fill="#44403c" />
                  <circle cx="101" cy="48" r="4" fill="#facc15" stroke="#78350f" strokeWidth="1.3" />
                </g>

                {/* Subtle Golden Latch-Close Sparkle When Doors Meet */}
                {latchSparkle > 0 && (
                  <g transform="translate(410, 246)" opacity={latchSparkle}>
                    <circle cx="0" cy="0" r="14" fill="rgba(254, 240, 138, 0.55)" />
                    <path
                      d="M0 -14 L3 -3 L14 0 L3 3 L0 14 L-3 3 L-14 0 L-3 -3 Z"
                      fill="#fef08a"
                    />
                  </g>
                )}
              </>
            );
          })()}
        </svg>
      </div>

      {/* 7. Realistic Botanical Wildflower Clusters Along the Wide Road Shoulders */}
      {ROADSIDE_FLOWERS.map((fl) => {
        const swayAmp = isWindSurprise ? 11 : isLightRain ? 6.5 : isFoggy ? 2.6 : 4.5;
        const swaySpeed = isWindSurprise ? 4.2 : isLightRain ? 2.6 : isFoggy ? 1.2 : 1.9;
        const sway = Math.sin(animTime * swaySpeed + fl.phaseOffset) * swayAmp;
        return (
          <div
            key={fl.id}
            className="absolute -translate-x-1/2 -translate-y-full pointer-events-none"
            style={{
              left: `${fl.xPct}%`,
              top: `${fl.yPct}%`,
              width: `${Math.round(60 * fl.scale)}px`,
              height: `${Math.round(80 * fl.scale)}px`,
              zIndex: Math.round(fl.yPct * 10) - 8,
            }}
          >
            <WildflowerClusterSVG kind={fl.kind} swayDeg={sway} className="w-full h-full" />
          </div>
        );
      })}

      {/* 8. Students on the Wide Road + Surprise Props */}
      {renderedStudents
        .filter((item) => item.action !== 'inside_yard')
        .map((item) => {
          const isSpeaking =
            phase === 'walking' &&
            dialogueSpeakerId === item.student.id &&
            dialogueText;
          const shortActionLabel =
            phase === 'walking'
              ? item.showGiantFlower
                ? 'Ồ! Khóm hoa siêu to!'
                : item.action === 'pick_flower'
                  ? 'Đang hái hoa...'
                  : item.action === 'catch_butterfly'
                    ? 'Đang bắt bướm...'
                    : item.action === 'wave_greet'
                      ? 'Vẫy tay chào!'
                      : item.action === 'bow_greet'
                        ? 'Cúi đầu chào!'
                        : null
              : null;

          return (
            <div
              key={item.student.id}
              onClick={() => onInspectStudent?.(item.student)}
              title="Nhấn để xem toàn thân Chibi & các biểu cảm"
              className="absolute -translate-x-1/2 -translate-y-[88%] cursor-pointer transition-transform hover:scale-[1.03]"
              style={{
                left: `${item.xPct}%`,
                top: `${item.yPct}%`,
                width: `${item.sizePx}px`,
                height: `${Math.round(item.sizePx * 1.28)}px`,
                zIndex: item.zIndex,
              }}
            >
              {isSpeaking && (
                <div className="absolute -top-14 left-1/2 -translate-x-1/2 w-max max-w-[230px] px-3 py-1.5 rounded-2xl bg-white/95 border-2 border-amber-400 shadow-lg text-center pointer-events-none z-20">
                  <p className="text-xs font-bold text-stone-800 leading-snug">
                    {dialogueText}
                  </p>
                </div>
              )}

              {item.isHighlighted && (
                <div
                  className="absolute inset-x-1 bottom-2 top-3 rounded-full pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(254, 240, 138, 0.72) 0%, rgba(254, 240, 138, 0) 72%)',
                  }}
                />
              )}

              {/* Hero Flower Bush (Extra Giant during Surprise!) */}
              {(item.action === 'pick_flower' || item.showGiantFlower) && (
                <div
                  className={`absolute -right-6 bottom-0 pointer-events-none ${
                    item.showGiantFlower ? 'w-24 h-32' : 'w-14 h-20'
                  }`}
                  style={{ zIndex: -1 }}
                >
                  <WildflowerClusterSVG
                    kind={item.showGiantFlower ? 'da_quy' : item.heroFlowerKind}
                    swayDeg={Math.sin(animTime * 4) * 5}
                    className="w-full h-full"
                  />
                </div>
              )}

              {/* Hero Realistic Butterfly Fluttering Near Student's Hands */}
              {item.showHeroButterfly && (
                <div
                  className="absolute -top-2 -right-6 w-12 h-12 pointer-events-none"
                  style={{
                    transform: `translate(${Math.sin(animTime * 4.5) * 10}px, ${
                      Math.cos(animTime * 5.2) * 8
                    }px)`,
                    zIndex: 15,
                  }}
                >
                  <RealisticButterflySVG
                    kind={item.heroButterflyKind}
                    flapPhase={animTime * 15}
                    tiltDeg={Math.sin(animTime * 4) * 14}
                    className="w-full h-full drop-shadow-sm"
                  />
                </div>
              )}

              <ChibiCharacterSVG
                student={item.student}
                expression={item.expression}
                action={item.action}
                holdingFlower={item.holdingFlower}
                animTime={animTime}
                facing={item.facing}
              />

              <div className="-mt-2 flex flex-col items-center gap-0.5 pointer-events-none">
                {shortActionLabel && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-[11px] font-bold text-amber-900 shadow-sm whitespace-nowrap">
                    {shortActionLabel}
                  </span>
                )}
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl border shadow-sm whitespace-nowrap ${
                    item.isHighlighted
                      ? 'bg-amber-300 border-amber-500 text-stone-950'
                      : 'bg-white/94 border-stone-200 text-stone-900'
                  }`}
                >
                  {item.student.avatarUrl && (
                    <img
                      src={item.student.avatarUrl}
                      alt={item.student.name}
                      className="w-5 h-5 rounded-full object-cover border border-white shrink-0"
                    />
                  )}
                  <span
                    className={`${
                      item.isHighlighted
                        ? 'text-sm sm:text-base font-extrabold'
                        : 'text-xs sm:text-sm font-bold'
                    }`}
                  >
                    {item.student.name}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

      {/* 9. Ambient + Surprise Swarm Realistic Butterflies */}
      {[...AMBIENT_BUTTERFLIES, ...(isSwarmSurprise ? SWARM_BUTTERFLIES : [])].map(
        (bf) => {
          const bx =
            bf.baseX + Math.sin(animTime * bf.speed + bf.phaseOffset) * bf.ampX;
          const by =
            bf.baseY +
            Math.sin(animTime * bf.speed * 1.7 + bf.phaseOffset) * bf.ampY;
          const dx = Math.cos(animTime * bf.speed + bf.phaseOffset);
          return (
            <div
              key={bf.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                left: `${bx}%`,
                top: `${by}%`,
                width: `${bf.sizePx}px`,
                height: `${bf.sizePx}px`,
                zIndex: Math.round(by * 10) + 40,
              }}
            >
              <RealisticButterflySVG
                kind={bf.kind}
                flapPhase={animTime * 13 + bf.phaseOffset}
                tiltDeg={dx * 18}
                className="w-full h-full drop-shadow-sm"
              />
            </div>
          );
        },
      )}

      {/* 10. Dynamic Weather Layer: Drifting Wildflower Petals (Cánh hoa rừng bay nhẹ) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 860 }}>
        {FLOATING_PETALS.filter((p) => !p.extraOnly || isWindSurprise).map(
          (p) => {
            const windBoost = isWindSurprise ? 2.1 : 1;
            const y = (p.startY + animTime * p.speedY * windBoost) % 106 - 3;
            const x =
              (p.startX +
                animTime * p.speedX * windBoost +
                Math.sin(animTime * p.swayFreq + p.phase) * p.swayAmp) %
              106 -
              3;
            const rot = (animTime * p.rotSpeed + p.phase * 40) % 360;
            const tiltScale = 0.55 + 0.45 * Math.abs(Math.cos(animTime * 2.2 + p.phase));

            return (
              <svg
                key={p.id}
                viewBox="0 0 24 24"
                className="absolute"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  transform: `rotate(${rot}deg) scaleY(${tiltScale})`,
                  opacity: 0.88,
                }}
              >
                <path
                  d="M12 2 C18 6, 20 14, 12 22 C4 14, 6 6, 12 2 Z"
                  fill={p.color}
                  stroke={p.accent}
                  strokeWidth="0.9"
                />
              </svg>
            );
          },
        )}
      </div>

      {/* 11. Dynamic Atmospheric Layer: Twinkling Golden Sun Motes (Nắng chiều lấp lánh) */}
      {(isSunny || isSunSurprise) && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 870 }}>
          {SUN_SPARKLES.filter((s) => !s.extraOnly || isSunSurprise).map((s) => {
            const driftY = s.y + Math.sin(animTime * 0.7 + s.phase) * 2.5;
            const driftX = s.x + Math.cos(animTime * 0.55 + s.phase) * 2.2;
            const glow = 0.25 + 0.75 * Math.pow(Math.max(0, Math.sin(animTime * s.speed + s.phase)), 2);
            const scale = (isSunSurprise ? 1.3 : 1) * (0.65 + 0.45 * glow);

            return (
              <svg
                key={s.id}
                viewBox="0 0 24 24"
                className="absolute"
                style={{
                  left: `${driftX}%`,
                  top: `${driftY}%`,
                  width: `${s.size}px`,
                  height: `${s.size}px`,
                  opacity: glow * (isSunSurprise ? 0.95 : 0.72),
                  transform: `scale(${scale})`,
                }}
              >
                <path
                  d="M12 1 L14.3 9.7 L23 12 L14.3 14.3 L12 23 L9.7 14.3 L1 12 L9.7 9.7 Z"
                  fill="#fef9c3"
                />
              </svg>
            );
          })}
        </div>
      )}

      {/* 12. Weather Overlay: Subtle Slanted Highland Light Rain (Mưa nhẹ) */}
      {isLightRain && (
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ zIndex: 875 }}
          aria-hidden="true"
        >
          {RAIN_STREAKS.map((drop) => {
            const y = ((drop.startY + animTime * drop.speedY) % 112) - 6;
            const x = ((drop.startX - animTime * drop.speedY * 0.16) % 116 + 116) % 116 - 8;
            return (
              <div
                key={drop.id}
                className="absolute rounded-full"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: `${drop.widthPx}px`,
                  height: `${drop.lengthPx}px`,
                  transform: 'rotate(11deg)',
                  opacity: drop.opacity,
                  background:
                    'linear-gradient(180deg, rgba(224, 242, 254, 0) 0%, rgba(224, 242, 254, 0.85) 65%, rgba(255, 255, 255, 0.95) 100%)',
                }}
              />
            );
          })}
        </div>
      )}

      {/* 13. Weather Overlay: Layered Drifting Highland Morning Fog (Sương mù) */}
      {isFoggy &&
        FOG_BANDS.map((band) => {
          const driftX = Math.sin(animTime * 0.24 * band.speed + band.phase) * 14;
          const driftY = Math.cos(animTime * 0.3 + band.phase) * 1.4;
          return (
            <div
              key={band.id}
              className="absolute pointer-events-none"
              aria-hidden="true"
              style={{
                top: `${band.topPct + driftY}%`,
                left: `${-25 + driftX}%`,
                width: `${band.widthPct}%`,
                height: `${band.heightPct}%`,
                zIndex: band.zIndex,
                opacity: band.opacity,
                background:
                  'radial-gradient(ellipse 46% 62% at 28% 52%, rgba(248, 252, 255, 0.9) 0%, rgba(235, 245, 250, 0.5) 48%, rgba(235, 245, 250, 0) 76%), radial-gradient(ellipse 48% 58% at 72% 48%, rgba(244, 250, 253, 0.85) 0%, rgba(232, 243, 248, 0.44) 50%, rgba(232, 243, 248, 0) 78%)',
              }}
            />
          );
        })}
    </div>
  );
};
