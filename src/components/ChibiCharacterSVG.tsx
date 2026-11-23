import React, { useId } from 'react';
import { ChibiAction, ChibiExpression, ChibiPreset, Student } from '../types';
import { getChibiPreset } from '../data/chibiCatalog';

interface ChibiCharacterSVGProps {
  student?: Student;
  preset?: ChibiPreset;
  expression?: ChibiExpression;
  action?: ChibiAction;
  holdingFlower?: boolean;
  animTime?: number;
  facing?: 'left' | 'right' | 'front';
  className?: string;
}

const SKIN_TONES = {
  fair: { light: '#fff4ec', mid: '#fde1d0', shade: '#efc3aa' },
  warm: { light: '#ffefe2', mid: '#f8d4bc', shade: '#e3b091' },
  sunlit: { light: '#fae5d2', mid: '#ecc09f', shade: '#d49d79' },
};

// Authentic handwoven Ca Dong brocade palette: Red, Black, Ivory White, Turmeric Gold
const CADONG_RED = '#C8232C';
const CADONG_RED_DEEP = '#9E1A22';
const CADONG_WHITE = '#FBF7F0';
const CADONG_GOLD = '#F2B705';
const SCARF_RED = '#DC2626';
const SCARF_DARK = '#B91C1C';

/**
 * 30-character Ca Dong Student Chibi Renderer (Ages 8–14):
 * - Natural child proportions (head ~37% height, balanced limbs, subtle age scale 8..14).
 * - Innocent warm face, consistent upper-left morning lighting, soft warm sepia outlines.
 * - Authentic handwoven Ca Dong brocade in Red, Black, Ivory White, Turmeric Gold:
 *   • Girls: Brocade tunic + tiered handwoven Ca Dong skirt + beaded necklace
 *   • Boys: Brocade traditional tunic + dark trousers with handwoven side/hem brocade & belt
 * - Red Pioneer Scarf (khăn quàng đỏ) with animated fluttering tails + school backpack.
 * - 6 diverse hairstyles (short, bangs, shoulder, braids, high_ponytail, twin_tails).
 */
export const ChibiCharacterSVG: React.FC<ChibiCharacterSVGProps> = ({
  student,
  preset: explicitPreset,
  expression = 'happy',
  action = 'idle',
  holdingFlower = false,
  animTime = 0,
  facing = 'front',
  className = 'w-full h-full',
}) => {
  const uid = useId().replace(/:/g, '');
  const line = '#4b352d';

  const resolvedPreset =
    explicitPreset ??
    getChibiPreset(
      student?.presetId,
      student?.gender ?? 'male',
      student?.hairStyle ?? 0,
    );

  const isFemale = resolvedPreset.gender === 'female';
  const skin = SKIN_TONES[resolvedPreset.skinTone];
  const ageNorm = (resolvedPreset.age - 8) / 6; // 0 (8yo) -> 1 (14yo)
  const heightScaleY = 0.96 + ageNorm * 0.06; // subtle age proportion nuance
  const headScale = 1.02 - ageNorm * 0.05; // slightly slimmer ratio for 12-14yo

  // Procedural smooth cycle offsets
  const isRunning = action === 'run' || expression === 'running';
  const isWavingGreet = action === 'wave_greet';
  const isBowingGreet = action === 'bow_greet';
  const isWaving =
    expression === 'waving' || action === 'inside_yard' || isWavingGreet;
  const isPicking = action === 'pick_flower';
  const isCatching = action === 'catch_butterfly';
  const isThinking = expression === 'thinking';
  const isSad = expression === 'sad';
  const isSurprised = expression === 'surprised';
  const isCurious = expression === 'curious';

  const bounce = isRunning
    ? Math.abs(Math.sin(animTime * 8.2)) * -7.5
    : isCatching
      ? Math.abs(Math.sin(animTime * 7.2)) * -9.5
      : isBowingGreet
        ? 3.5 + Math.sin(animTime * 3.6) * 2
        : isPicking
          ? 4.5 + Math.sin(animTime * 4.2) * 3
          : isWaving
            ? Math.sin(animTime * 4.4) * -3.8
            : Math.sin(animTime * 2.4) * -1.8;

  const bodyTilt = isBowingGreet
    ? 14 + Math.sin(animTime * 3.6) * 3
    : isPicking
      ? 13 + Math.sin(animTime * 4.2) * 4
      : isCatching
        ? Math.sin(animTime * 3.8) * 5.5
        : isRunning
          ? 4.2
          : isCurious
            ? 3.5
            : isSad
              ? -2
              : 0;

  const headTilt = isBowingGreet
    ? 15 + Math.sin(animTime * 3.6) * 2.5
    : isPicking
      ? -4 + Math.sin(animTime * 4.2) * 3
      : isCatching
        ? Math.sin(animTime * 4.8) * 5.5
        : isCurious
          ? -7.5
          : isThinking
            ? 6
            : isSad
              ? 4.5
              : isWaving
                ? Math.sin(animTime * 3.8) * 4
                : Math.sin(animTime * 2) * 1.8;

  const scarfFlutter = isRunning
    ? Math.sin(animTime * 11) * 7
    : isCatching
      ? Math.sin(animTime * 9) * 5.5
      : Math.sin(animTime * 3.2) * 2.5;

  const leftLegRot = isRunning
    ? Math.sin(animTime * 8.2) * 22
    : isCatching
      ? Math.sin(animTime * 7.2) * 14
      : isWavingGreet
        ? Math.sin(animTime * 4.4) * 6
        : 0;
  const rightLegRot = isRunning
    ? -Math.sin(animTime * 8.2) * 22
    : isCatching
      ? -Math.sin(animTime * 7.2) * 14
      : isWavingGreet
        ? -Math.sin(animTime * 4.4) * 6
        : 0;

  let leftArmRot = isRunning
    ? -Math.sin(animTime * 8.2) * 24
    : Math.sin(animTime * 2.4) * 3.5;
  let rightArmRot = isRunning
    ? Math.sin(animTime * 8.2) * 24
    : -Math.sin(animTime * 2.4) * 3.5;

  if (isBowingGreet) {
    leftArmRot = -22;
    rightArmRot = 22;
  } else if (isWaving) {
    rightArmRot = -138 + Math.sin(animTime * 10.5) * 19;
    leftArmRot = 14;
  } else if (isPicking) {
    rightArmRot = -54 + Math.sin(animTime * 4.8) * 11;
    leftArmRot = 24 + Math.cos(animTime * 4.2) * 4;
  } else if (isCatching) {
    const flapReach = Math.sin(animTime * 9.5) * 19;
    leftArmRot = 114 + flapReach;
    rightArmRot = -114 - flapReach;
  } else if (isThinking) {
    rightArmRot = -110;
    leftArmRot = 10;
  } else if (isSurprised) {
    leftArmRot = 66;
    rightArmRot = -66;
  } else if (isSad) {
    leftArmRot = 14;
    rightArmRot = -14;
  }

  const flipX = facing === 'left' ? -1 : 1;
  const { hairStyle, brocadeVariant, accessory, neckStyle } = resolvedPreset;

  return (
    <svg
      viewBox="-16 -22 272 346"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label={student?.name || resolvedPreset.label}
    >
      <defs>
        {/* Consistent upper-left morning illumination on skin */}
        <radialGradient id={`skin-${uid}`} cx="38%" cy="34%" r="66%">
          <stop offset="0%" stopColor={skin.light} />
          <stop offset="65%" stopColor={skin.mid} />
          <stop offset="100%" stopColor={skin.shade} />
        </radialGradient>

        {/* Soft natural rosy cheek blush */}
        <radialGradient id={`blush-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f38ba0" stopOpacity="0.58" />
          <stop offset="68%" stopColor="#f8b4c2" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#f8b4c2" stopOpacity="0" />
        </radialGradient>

        {/* Luminous innocent eyes */}
        <linearGradient id={`iris-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e1715" />
          <stop offset="52%" stopColor={resolvedPreset.eyeColor} />
          <stop offset="100%" stopColor="#9c755d" />
        </linearGradient>

        {/* Hair with consistent upper-left sunlit sheen */}
        <linearGradient id={`hair-${uid}`} x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor={resolvedPreset.hairHighlight} />
          <stop offset="38%" stopColor={resolvedPreset.hairColor} />
          <stop offset="100%" stopColor="#181416" />
        </linearGradient>

        {/* Authentic deep black-indigo handwoven Ca Dong fabric */}
        <linearGradient id={`tunic-${uid}`} x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#2e3442" />
          <stop offset="48%" stopColor={resolvedPreset.tunicBase} />
          <stop offset="100%" stopColor="#12151c" />
        </linearGradient>

        {/* Backpack gentle shading */}
        <linearGradient id={`pack-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={resolvedPreset.backpackColor} />
          <stop offset="100%" stopColor="#1e293b" stopOpacity="0.92" />
        </linearGradient>

        {/* Red Pioneer Scarf smooth shading */}
        <linearGradient id={`scarf-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="55%" stopColor={SCARF_RED} />
          <stop offset="100%" stopColor={SCARF_DARK} />
        </linearGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse
        cx="120"
        cy="308"
        rx={isRunning ? 38 : 44}
        ry="8.5"
        fill="rgba(75, 58, 46, 0.17)"
      />

      {/* Main Character Group with natural child age proportion */}
      <g
        transform={`translate(120, 308) scale(${flipX}, ${heightScaleY}) translate(-120, ${-308 + bounce}) rotate(${bodyTilt}, 120, 244)`}
      >
        {/* SCHOOL BACKPACK (behind shoulders) */}
        <g>
          <rect
            x="72"
            y="148"
            width="96"
            height="78"
            rx="22"
            fill={resolvedPreset.backpackColor}
            stroke={line}
            strokeWidth="2"
          />
          {/* Subtle top-left sunlit backpack sheen */}
          <rect
            x="77"
            y="152"
            width="86"
            height="26"
            rx="14"
            fill={resolvedPreset.backpackTrim}
            opacity="0.9"
          />
          <rect
            x="82"
            y="186"
            width="76"
            height="28"
            rx="10"
            fill="rgba(255,255,255,0.16)"
            stroke={line}
            strokeWidth="1.2"
          />
          {/* Side pocket accents */}
          <rect
            x="66"
            y="176"
            width="9"
            height="30"
            rx="4.5"
            fill={resolvedPreset.backpackColor}
            stroke={line}
            strokeWidth="1.6"
          />
          <rect
            x="165"
            y="176"
            width="9"
            height="30"
            rx="4.5"
            fill={resolvedPreset.backpackColor}
            stroke={line}
            strokeWidth="1.6"
          />
        </g>

        {/* BACK HAIR LAYER (for all 6 diverse hairstyles) */}
        <g
          fill={`url(#hair-${uid})`}
          stroke={line}
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {hairStyle === 'short' && (
            <path d="M68 88 C62 72, 68 44, 88 38 C100 28, 140 28, 152 38 C172 44, 178 72, 172 88 C172 106, 166 118, 158 122 L82 122 C74 118, 68 106, 68 88 Z" />
          )}

          {hairStyle === 'bangs' && (
            <path
              d={
                isFemale
                  ? 'M64 82 C54 112, 54 148, 70 162 C82 170, 94 162, 94 150 L146 150 C146 162, 158 170, 170 162 C186 148, 186 112, 176 82 Z'
                  : 'M66 86 C60 66, 68 42, 88 36 C104 28, 136 28, 152 36 C172 42, 180 66, 174 86 C176 108, 168 124, 158 128 L82 128 C72 124, 64 108, 66 86 Z'
              }
            />
          )}

          {hairStyle === 'shoulder' && (
            <path
              d={
                isFemale
                  ? 'M62 82 C48 114, 46 156, 64 174 C76 184, 92 176, 94 162 L146 162 C148 176, 164 184, 176 174 C194 156, 192 114, 178 82 Z'
                  : 'M64 84 C54 110, 56 140, 72 152 L168 152 C184 140, 186 110, 176 84 Z'
              }
            />
          )}

          {hairStyle === 'braids' && (
            <>
              <path d="M64 88 C58 112, 62 136, 76 144 L164 144 C178 136, 182 112, 176 88 Z" />
              {/* Left segmented braid */}
              <ellipse cx="64" cy="116" rx="10" ry="12" />
              <ellipse cx="61" cy="134" rx="9.5" ry="11.5" />
              <ellipse cx="60" cy="151" rx="8.5" ry="11" />
              <ellipse cx="61" cy="167" rx="7.5" ry="9.5" />
              <path d="M58 175 L54 186 L64 182 L68 186 L65 175 Z" />
              {/* Right segmented braid */}
              <ellipse cx="176" cy="116" rx="10" ry="12" />
              <ellipse cx="179" cy="134" rx="9.5" ry="11.5" />
              <ellipse cx="180" cy="151" rx="8.5" ry="11" />
              <ellipse cx="179" cy="167" rx="7.5" ry="9.5" />
              <path d="M175 175 L172 186 L176 182 L186 186 L182 175 Z" />
              {/* Ca Dong brocade hair ties */}
              <rect x="54" y="170" width="14" height="5.5" rx="2.5" fill={CADONG_RED} />
              <rect x="172" y="170" width="14" height="5.5" rx="2.5" fill={CADONG_RED} />
              <circle cx="61" cy="172.7" r="1.8" fill={CADONG_GOLD} stroke="none" />
              <circle cx="179" cy="172.7" r="1.8" fill={CADONG_GOLD} stroke="none" />
            </>
          )}

          {hairStyle === 'high_ponytail' && (
            <>
              {/* High flowing ponytail / topknot */}
              {isFemale ? (
                <>
                  <path d="M120 28 C144 10, 178 24, 180 62 C182 92, 194 114, 184 134 C172 132, 162 114, 160 88 C158 66, 144 46, 120 42 Z" />
                  <ellipse cx="120" cy="30" rx="16" ry="11" />
                  <path d="M107 34 Q120 26 133 34" fill="none" stroke={CADONG_RED} strokeWidth="5.5" />
                  <path d="M111 33 Q120 28 129 33" fill="none" stroke={CADONG_GOLD} strokeWidth="2" />
                </>
              ) : (
                <>
                  <ellipse cx="120" cy="24" rx="15" ry="13" />
                  <path d="M108 32 Q120 27 132 32" fill="none" stroke={CADONG_RED} strokeWidth="4.5" />
                </>
              )}
              <path d="M66 86 C60 108, 64 132, 78 140 L162 140 C176 132, 180 108, 174 86 Z" />
            </>
          )}

          {hairStyle === 'twin_tails' && (
            <>
              {/* Left & right bouncy twin tails */}
              <path d="M68 62 C44 58, 34 86, 40 122 C44 142, 34 156, 46 164 C58 162, 64 140, 66 116 C68 96, 70 78, 72 68 Z" />
              <path d="M172 62 C196 58, 206 86, 200 122 C196 142, 206 156, 194 164 C182 162, 176 140, 174 116 C172 96, 170 78, 168 68 Z" />
              {/* Twin Ca Dong red-gold ribbons */}
              <ellipse cx="66" cy="65" rx="7" ry="5" fill={CADONG_RED} />
              <ellipse cx="174" cy="65" rx="7" ry="5" fill={CADONG_RED} />
              <circle cx="66" cy="65" r="2.2" fill={CADONG_GOLD} stroke="none" />
              <circle cx="174" cy="65" r="2.2" fill={CADONG_GOLD} stroke="none" />
              <path d="M66 88 C62 110, 68 130, 80 138 L160 138 C172 130, 178 110, 174 88 Z" />
            </>
          )}
        </g>

        {/* LEGS & SHOES (Natural child proportions for ages 8–14) */}
        <g>
          {/* Left Leg */}
          <g transform={`rotate(${leftLegRot}, 103, 232)`}>
            {isFemale ? (
              <>
                {/* Natural child lower leg + white school sock + neat dark shoe */}
                <rect
                  x="95"
                  y="236"
                  width="16"
                  height="42"
                  rx="8"
                  fill={`url(#skin-${uid})`}
                  stroke={line}
                  strokeWidth="1.8"
                />
                <rect
                  x="94.5"
                  y="264"
                  width="17"
                  height="16"
                  rx="4"
                  fill={CADONG_WHITE}
                  stroke={line}
                  strokeWidth="1.5"
                />
                <ellipse
                  cx="101"
                  cy="288"
                  rx="15"
                  ry="8.5"
                  fill="#3b2f2f"
                  stroke={line}
                  strokeWidth="1.9"
                />
                <path
                  d="M93 284 Q102 288 111 284"
                  fill="none"
                  stroke={CADONG_RED}
                  strokeWidth="2.2"
                />
              </>
            ) : (
              <>
                {/* Traditional Ca Dong dark trouser leg with woven red-gold-white side stripe & hem */}
                <rect
                  x="91"
                  y="222"
                  width="22"
                  height="60"
                  rx="8"
                  fill={`url(#tunic-${uid})`}
                  stroke={line}
                  strokeWidth="1.9"
                />
                {/* Vertical Ca Dong brocade side stripe */}
                <rect x="93" y="226" width="3.5" height="48" fill={CADONG_RED} />
                <line x1="94.7" y1="228" x2="94.7" y2="272" stroke={CADONG_GOLD} strokeWidth="1.2" strokeDasharray="3 3" />
                {/* Woven trouser cuff */}
                <rect x="91.5" y="272" width="21" height="6" fill={CADONG_RED} />
                <line x1="91.5" y1="272" x2="112.5" y2="272" stroke={CADONG_GOLD} strokeWidth="1.5" />
                <line x1="91.5" y1="278" x2="112.5" y2="278" stroke={CADONG_WHITE} strokeWidth="1.3" />
                {/* Sturdy dark shoe */}
                <ellipse
                  cx="100"
                  cy="288"
                  rx="16"
                  ry="8.5"
                  fill="#3b2f2f"
                  stroke={line}
                  strokeWidth="1.9"
                />
                <ellipse cx="98" cy="285" rx="6.5" ry="2.6" fill="#6b5652" opacity="0.55" />
              </>
            )}
          </g>

          {/* Right Leg */}
          <g transform={`rotate(${rightLegRot}, 137, 232)`}>
            {isFemale ? (
              <>
                <rect
                  x="129"
                  y="236"
                  width="16"
                  height="42"
                  rx="8"
                  fill={`url(#skin-${uid})`}
                  stroke={line}
                  strokeWidth="1.8"
                />
                <rect
                  x="128.5"
                  y="264"
                  width="17"
                  height="16"
                  rx="4"
                  fill={CADONG_WHITE}
                  stroke={line}
                  strokeWidth="1.5"
                />
                <ellipse
                  cx="139"
                  cy="288"
                  rx="15"
                  ry="8.5"
                  fill="#3b2f2f"
                  stroke={line}
                  strokeWidth="1.9"
                />
                <path
                  d="M129 284 Q138 288 147 284"
                  fill="none"
                  stroke={CADONG_RED}
                  strokeWidth="2.2"
                />
              </>
            ) : (
              <>
                <rect
                  x="127"
                  y="222"
                  width="22"
                  height="60"
                  rx="8"
                  fill={`url(#tunic-${uid})`}
                  stroke={line}
                  strokeWidth="1.9"
                />
                <rect x="143.5" y="226" width="3.5" height="48" fill={CADONG_RED} />
                <line x1="145.2" y1="228" x2="145.2" y2="272" stroke={CADONG_GOLD} strokeWidth="1.2" strokeDasharray="3 3" />
                <rect x="127.5" y="272" width="21" height="6" fill={CADONG_RED} />
                <line x1="127.5" y1="272" x2="148.5" y2="272" stroke={CADONG_GOLD} strokeWidth="1.5" />
                <line x1="127.5" y1="278" x2="148.5" y2="278" stroke={CADONG_WHITE} strokeWidth="1.3" />
                <ellipse
                  cx="140"
                  cy="288"
                  rx="16"
                  ry="8.5"
                  fill="#3b2f2f"
                  stroke={line}
                  strokeWidth="1.9"
                />
                <ellipse cx="138" cy="285" rx="6.5" ry="2.6" fill="#6b5652" opacity="0.55" />
              </>
            )}
          </g>
        </g>

        {/* LEFT ARM (Ca Dong woven cuff + rounded child hand) */}
        <g transform={`rotate(${leftArmRot}, 84, 158)`}>
          <path
            d="M86 154 C70 162, 58 184, 62 206 C64 214, 75 214, 79 204 C85 190, 89 174, 91 162 Z"
            fill={`url(#tunic-${uid})`}
            stroke={line}
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          {/* Handwoven Ca Dong sleeve cuff (red + gold + white) */}
          <path
            d="M61 196 Q70 201 80 196 L78 206 Q70 210 62 205 Z"
            fill={CADONG_RED}
            stroke={line}
            strokeWidth="1.4"
          />
          <path d="M61.5 196 Q70 201 79.5 196" fill="none" stroke={CADONG_GOLD} strokeWidth="1.8" />
          <path d="M62 204 Q70 208 78 204" fill="none" stroke={CADONG_WHITE} strokeWidth="1.4" />
          <circle
            cx="69"
            cy="214"
            r="9.5"
            fill={`url(#skin-${uid})`}
            stroke={line}
            strokeWidth="1.8"
          />
        </g>

        {/* TORSO & AUTHENTIC HANDWOVEN CA DONG TRADITIONAL ATTIRE */}
        <g>
          {/* LOWER GARMENT: Girl = Handwoven Brocade Skirt | Boy = Traditional Tunic Hem + Sash */}
          {isFemale ? (
            <g>
              {/* Flared Traditional Ca Dong Brocade Skirt */}
              <path
                d="M84 202 L156 202 C168 228, 172 248, 166 258 C142 264, 98 264, 74 258 C68 248, 72 228, 84 202 Z"
                fill={`url(#tunic-${uid})`}
                stroke={line}
                strokeWidth="2"
                strokeLinejoin="round"
              />
              {/* Upper skirt gold & white woven stripe */}
              <path d="M79 220 Q120 225 161 220" fill="none" stroke={CADONG_WHITE} strokeWidth="2.2" />
              <path d="M78 224 Q120 229 162 224" fill="none" stroke={CADONG_GOLD} strokeWidth="2.2" />
              {/* Wide Ca Dong Red Brocade Lower Band */}
              <path
                d="M74 234 Q120 240 166 234 L167 251 Q120 257 73 251 Z"
                fill={CADONG_RED}
              />
              {/* Top & bottom handwoven trim lines */}
              <path d="M74 234 Q120 240 166 234" fill="none" stroke={CADONG_GOLD} strokeWidth="2.3" />
              <path d="M73 251 Q120 257 167 251" fill="none" stroke={CADONG_WHITE} strokeWidth="2.1" />
              {/* Authentic geometric handwoven motif (varies across 3 brocade variants) */}
              {brocadeVariant === 'classic_diamond' &&
                [84, 98, 112, 126, 140, 154].map((dx) => (
                  <g key={dx}>
                    <polygon
                      points={`${dx},238 ${dx + 4.5},243 ${dx},248 ${dx - 4.5},243`}
                      fill={CADONG_GOLD}
                    />
                    <circle cx={dx} cy="243" r="1.5" fill={CADONG_WHITE} />
                  </g>
                ))}
              {brocadeVariant === 'zigzag_mountain' && (
                <path
                  d="M76 246 L84 238 L92 246 L100 238 L108 246 L116 238 L124 246 L132 238 L140 246 L148 238 L156 246 L164 238"
                  fill="none"
                  stroke={CADONG_WHITE}
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
              )}
              {brocadeVariant === 'royal_stripe' && (
                <>
                  <path d="M74 242 Q120 248 166 242" fill="none" stroke={CADONG_GOLD} strokeWidth="3" />
                  {[86, 103, 120, 137, 154].map((dx) => (
                    <polygon
                      key={dx}
                      points={`${dx},237 ${dx + 3.5},242 ${dx},247 ${dx - 3.5},242`}
                      fill={CADONG_WHITE}
                    />
                  ))}
                </>
              )}
            </g>
          ) : (
            <g>
              {/* Boy Traditional Ca Dong Tunic Lower Flap + Woven Belt */}
              <path
                d="M84 200 L156 200 L160 234 Q120 239 80 234 Z"
                fill={`url(#tunic-${uid})`}
                stroke={line}
                strokeWidth="2"
                strokeLinejoin="round"
              />
              {/* Bottom red-gold-white brocade tunic border */}
              <path
                d="M81 221 Q120 226 159 221 L160 232 Q120 237 80 232 Z"
                fill={CADONG_RED}
              />
              <path d="M81 221 Q120 226 159 221" fill="none" stroke={CADONG_GOLD} strokeWidth="2.1" />
              <path d="M80 232 Q120 237 160 232" fill="none" stroke={CADONG_WHITE} strokeWidth="1.8" />
              {brocadeVariant === 'zigzag_mountain' ? (
                <path
                  d="M84 229 L92 224 L100 229 L108 224 L116 229 L124 224 L132 229 L140 224 L148 229 L156 224"
                  fill="none"
                  stroke={CADONG_WHITE}
                  strokeWidth="1.9"
                  strokeLinejoin="round"
                />
              ) : (
                [90, 105, 120, 135, 150].map((dx) => (
                  <polygon
                    key={dx}
                    points={`${dx},223.5 ${dx + 3.8},227 ${dx},230.5 ${dx - 3.8},227`}
                    fill={CADONG_GOLD}
                  />
                ))
              )}
            </g>
          )}

          {/* UPPER CA DONG HANDWOVEN TUNIC */}
          <path
            d="M88 148 C84 166, 83 190, 84 205 Q120 210 156 205 C157 190, 156 166, 152 148 Z"
            fill={`url(#tunic-${uid})`}
            stroke={line}
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Ca Dong Chest Brocade Band (Red, Gold, White) */}
          <path
            d="M85 170 Q120 176 155 170 L155.5 182 Q120 188 84.5 182 Z"
            fill={CADONG_RED}
          />
          <path d="M85 170 Q120 176 155 170" fill="none" stroke={CADONG_GOLD} strokeWidth="2" />
          <path d="M84.5 182 Q120 188 155.5 182" fill="none" stroke={CADONG_WHITE} strokeWidth="1.7" />
          {[94, 107, 120, 133, 146].map((dx) => (
            <polygon
              key={dx}
              points={`${dx},173 ${dx + 3.2},176.5 ${dx},180 ${dx - 3.2},176.5`}
              fill={dx === 120 ? CADONG_WHITE : CADONG_GOLD}
            />
          ))}

          {/* Vertical Front Woven Placket */}
          {neckStyle === 'v_neck' ? (
            <path
              d="M108 149 L120 171 L132 149"
              fill="none"
              stroke={CADONG_GOLD}
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
          ) : (
            <rect x="115" y="182" width="10" height="22" rx="3" fill={CADONG_RED_DEEP} />
          )}

          {/* Handwoven Ca Dong Waist Sash */}
          <path
            d="M83 198 Q120 204 157 198 L156 207 Q120 213 84 207 Z"
            fill={CADONG_RED}
            stroke={line}
            strokeWidth="1.6"
          />
          <path d="M84 202.5 Q120 208.5 156 202.5" fill="none" stroke={CADONG_GOLD} strokeWidth="2" strokeDasharray="5 3" />
          {/* Traditional woven sash tassel */}
          {!isFemale && (
            <g>
              <path d="M142 206 L146 222" stroke={CADONG_RED} strokeWidth="4" strokeLinecap="round" />
              <circle cx="146" cy="222" r="2.6" fill={CADONG_GOLD} />
            </g>
          )}

          {/* Traditional Ca Dong White & Gold Beaded Necklace (Girls) */}
          {isFemale &&
            [98, 105, 112, 120, 128, 135, 142].map((bx, i) => (
              <circle
                key={bx}
                cx={bx}
                cy={163 + Math.sin((i / 6) * Math.PI) * 6}
                r="2.8"
                fill={i % 2 === 0 ? CADONG_WHITE : CADONG_GOLD}
                stroke={line}
                strokeWidth="0.9"
              />
            ))}

          {/* School Backpack Shoulder Straps */}
          <path
            d="M93 148 Q88 174 92 199"
            fill="none"
            stroke={resolvedPreset.backpackColor}
            strokeWidth="6.5"
            strokeLinecap="round"
          />
          <path
            d="M93 148 Q88 174 92 199"
            fill="none"
            stroke={resolvedPreset.backpackTrim}
            strokeWidth="1.8"
            strokeDasharray="4 4"
            strokeLinecap="round"
          />
          <path
            d="M147 148 Q152 174 148 199"
            fill="none"
            stroke={resolvedPreset.backpackColor}
            strokeWidth="6.5"
            strokeLinecap="round"
          />
          <path
            d="M147 148 Q152 174 148 199"
            fill="none"
            stroke={resolvedPreset.backpackTrim}
            strokeWidth="1.8"
            strokeDasharray="4 4"
            strokeLinecap="round"
          />

          {/* RED PIONEER SCARF (KHĂN QUÀNG ĐỎ ĐỘI VIÊN) */}
          <g>
            {/* Collar wrap around neck */}
            <path
              d="M99 144 Q120 156 141 144 L145 153 Q120 166 95 153 Z"
              fill={`url(#scarf-${uid})`}
              stroke="#7f1d1d"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {/* Fluttering scarf tails */}
            <g transform={`rotate(${scarfFlutter}, 120, 158)`}>
              <path
                d="M116 158 L108 188 L119 183 L121 159 Z"
                fill={SCARF_RED}
                stroke="#7f1d1d"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <path
                d="M124 158 L133 191 L122 185 L120 159 Z"
                fill={`url(#scarf-${uid})`}
                stroke="#7f1d1d"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </g>
            {/* Crisp triangular Pioneer knot */}
            <polygon
              points="114,154 126,154 123,163 117,163"
              fill="#ef4444"
              stroke="#7f1d1d"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </g>
        </g>

        {/* RIGHT ARM (with wildflower when picking/holding) */}
        <g transform={`rotate(${rightArmRot}, 156, 158)`}>
          <path
            d="M154 154 C170 162, 182 184, 178 206 C176 214, 165 214, 161 204 C155 190, 151 174, 149 162 Z"
            fill={`url(#tunic-${uid})`}
            stroke={line}
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <path
            d="M179 196 Q170 201 160 196 L162 206 Q170 210 178 205 Z"
            fill={CADONG_RED}
            stroke={line}
            strokeWidth="1.4"
          />
          <path d="M178.5 196 Q170 201 160.5 196" fill="none" stroke={CADONG_GOLD} strokeWidth="1.8" />
          <path d="M178 204 Q170 208 162 204" fill="none" stroke={CADONG_WHITE} strokeWidth="1.4" />
          <circle
            cx="171"
            cy="214"
            r="9.5"
            fill={`url(#skin-${uid})`}
            stroke={line}
            strokeWidth="1.8"
          />

          {/* Held wildflower prop */}
          {(holdingFlower || isPicking) && (
            <g transform="translate(173, 214) rotate(26)">
              <path
                d="M0 4 Q2 -14 0 -30"
                fill="none"
                stroke="#4d9b56"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M0 -12 Q10 -18 14 -12 Q6 -8 0 -12 Z"
                fill="#76c47f"
                stroke="#3f7d47"
                strokeWidth="1.1"
              />
              {[0, 72, 144, 216, 288].map((deg) => (
                <ellipse
                  key={deg}
                  cx="0"
                  cy="-36"
                  rx="4.4"
                  ry="8"
                  fill="#fde047"
                  stroke="#d97706"
                  strokeWidth="1.1"
                  transform={`rotate(${deg}, 0, -30)`}
                />
              ))}
              <circle cx="0" cy="-30" r="4.3" fill="#f59e0b" />
            </g>
          )}
        </g>

        {/* NECK */}
        <rect
          x="111.5"
          y="133"
          width="17"
          height="18"
          rx="7.5"
          fill={skin.shade}
          stroke={line}
          strokeWidth="1.7"
        />

        {/* HEAD GROUP (Natural 8–14 child Chibi proportion, ~37% of total height) */}
        <g
          transform={`translate(120, 142) scale(${headScale}) translate(-120, -142) rotate(${headTilt}, 120, 142)`}
        >
          {/* Rounded Ears */}
          <ellipse
            cx="68"
            cy="98"
            rx="9"
            ry="11.5"
            fill={`url(#skin-${uid})`}
            stroke={line}
            strokeWidth="1.8"
          />
          <ellipse
            cx="172"
            cy="98"
            rx="9"
            ry="11.5"
            fill={`url(#skin-${uid})`}
            stroke={line}
            strokeWidth="1.8"
          />

          {/* Innocent Child Face Contour */}
          <path
            d="M69 90 C67 49, 92 34, 120 34 C148 34, 173 49, 171 90 C169 125, 147 142, 120 142 C93 142, 71 125, 69 90 Z"
            fill={`url(#skin-${uid})`}
            stroke={line}
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Soft Cheek Blush */}
          <ellipse cx="86" cy="109" rx="13" ry="8" fill={`url(#blush-${uid})`} />
          <ellipse cx="154" cy="109" rx="13" ry="8" fill={`url(#blush-${uid})`} />

          {/* LUMINOUS INNOCENT EYES */}
          {[95, 145].map((cx, eyeIdx) => {
            const lookShiftX = isThinking ? 3.2 : isCurious ? 1.5 : 0;
            const lookShiftY = isThinking ? -2.8 : 0;
            const eyeScaleY = isSurprised ? 1.13 : isSad ? 0.92 : 1;

            return (
              <g
                key={cx}
                transform={`translate(${cx}, 94) scale(1, ${eyeScaleY})`}
              >
                <ellipse cx="0" cy="0" rx="12.6" ry="14" fill="#ffffff" />
                <path
                  d="M-11.5 -3.5 Q0 -13.5 11.5 -3.5"
                  fill="none"
                  stroke="rgba(75,53,45,0.16)"
                  strokeWidth="3"
                />
                <ellipse
                  cx={lookShiftX}
                  cy={1 + lookShiftY}
                  rx={isSurprised ? 8.6 : 10}
                  ry={isSurprised ? 10.5 : 11.8}
                  fill={`url(#iris-${uid})`}
                />
                <circle
                  cx={lookShiftX}
                  cy={1.4 + lookShiftY}
                  r={isSurprised ? 4 : 4.8}
                  fill="#1e1512"
                />
                <path
                  d="M-5 7 Q0 10.5 5 7"
                  fill="none"
                  stroke="#fde68a"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.68"
                />
                {/* Upper-left consistent light catchlight */}
                <circle
                  cx={-3.8 + lookShiftX * 0.4}
                  cy={-4 + lookShiftY * 0.4}
                  r="3.6"
                  fill="#ffffff"
                />
                <circle
                  cx={3.8 + lookShiftX * 0.4}
                  cy={4 + lookShiftY * 0.4}
                  r="1.7"
                  fill="#ffffff"
                />
                {isSad && (
                  <ellipse
                    cx="-4.5"
                    cy="8"
                    rx="3.6"
                    ry="2.2"
                    fill="#bae6fd"
                    opacity="0.9"
                  />
                )}
                {/* Upper eyelash (delicately winged for girls, crisp natural for boys) */}
                <path
                  d="M-13.5 -1.5 C-10.5 -13.5, 10.5 -13.5, 13.5 -1.5"
                  fill="none"
                  stroke={line}
                  strokeWidth={isFemale ? '2.5' : '2.3'}
                  strokeLinecap="round"
                />
                {isFemale && (
                  <path
                    d={eyeIdx === 0 ? 'M-13.5 -1.5 L-17 -4.5' : 'M13.5 -1.5 L17 -4.5'}
                    fill="none"
                    stroke={line}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                )}
              </g>
            );
          })}

          {/* EYEBROWS */}
          {isSad ? (
            <>
              <path d="M83 74 Q94 71 103 68" fill="none" stroke={line} strokeWidth="2" strokeLinecap="round" />
              <path d="M157 74 Q146 71 137 68" fill="none" stroke={line} strokeWidth="2" strokeLinecap="round" />
            </>
          ) : isSurprised ? (
            <>
              <path d="M84 67 Q95 61 104 67" fill="none" stroke={line} strokeWidth="2" strokeLinecap="round" />
              <path d="M136 67 Q145 61 156 67" fill="none" stroke={line} strokeWidth="2" strokeLinecap="round" />
            </>
          ) : isCurious ? (
            <>
              <path d="M84 70 Q94 64 104 69" fill="none" stroke={line} strokeWidth="2" strokeLinecap="round" />
              <path d="M136 74 Q146 72 156 74" fill="none" stroke={line} strokeWidth="2" strokeLinecap="round" />
            </>
          ) : (
            <>
              <path
                d="M84 73 Q95 69 104 73"
                fill="none"
                stroke={line}
                strokeWidth={isFemale ? '1.8' : '2.2'}
                strokeLinecap="round"
              />
              <path
                d="M136 73 Q145 69 156 73"
                fill="none"
                stroke={line}
                strokeWidth={isFemale ? '1.8' : '2.2'}
                strokeLinecap="round"
              />
            </>
          )}

          {/* SMALL NATURAL NOSE */}
          <path
            d="M119 105 Q121 107 119 109"
            fill="none"
            stroke="#b8836b"
            strokeWidth="1.7"
            strokeLinecap="round"
          />

          {/* EXPRESSIVE MOUTH */}
          {isSurprised ? (
            <ellipse
              cx="120"
              cy="120"
              rx="5.5"
              ry="7"
              fill="#ef7b7b"
              stroke={line}
              strokeWidth="1.7"
            />
          ) : isSad ? (
            <path
              d="M112 123 Q120 116.5 128 123"
              fill="none"
              stroke={line}
              strokeWidth="1.9"
              strokeLinecap="round"
            />
          ) : isThinking ? (
            <path
              d="M115 120 Q121 121 125 119"
              fill="none"
              stroke={line}
              strokeWidth="1.9"
              strokeLinecap="round"
            />
          ) : isCurious ? (
            <path
              d="M112 119 Q116 124 120 119 Q124 124 128 119"
              fill="none"
              stroke={line}
              strokeWidth="1.9"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M111 117 Q120 127 129 117 Z"
              fill="#f08299"
              stroke={line}
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          )}

          {isSurprised && (
            <path
              d="M164 58 C160 66, 160 72, 164 72 C168 72, 168 66, 164 58 Z"
              fill="#bae6fd"
              stroke="#60a5fa"
              strokeWidth="1.3"
            />
          )}

          {/* FRONT HAIR LAYER (distinctly sculpted per 6 hairstyles & gender) */}
          <g
            fill={`url(#hair-${uid})`}
            stroke={line}
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {hairStyle === 'short' && (
              <>
                <path d="M67 88 C65 46, 90 30, 120 30 C150 30, 175 46, 173 88 C168 74, 160 64, 152 76 C144 60, 134 56, 126 70 C118 54, 106 56, 100 72 C92 58, 78 66, 67 88 Z" />
                {!isFemale && (
                  <path d="M112 31 Q118 18 130 23 Q122 26 118 32 Z" />
                )}
              </>
            )}

            {hairStyle === 'bangs' && (
              <>
                {/* Full soft straight/feathered bangs */}
                <path d="M66 90 C64 46, 90 30, 120 30 C150 30, 176 46, 174 90 C168 78, 162 76, 156 80 L146 78 L142 82 L128 79 L120 83 L112 79 L98 82 L94 78 L84 80 C78 76, 72 78, 66 90 Z" />
                <path d="M66 84 C63 102, 66 116, 73 120 C70 108, 71 96, 74 86 Z" />
                <path d="M174 84 C177 102, 174 116, 167 120 C170 108, 169 96, 166 86 Z" />
              </>
            )}

            {hairStyle === 'shoulder' && (
              <>
                {/* Side-parted soft layered fringe */}
                <path d="M66 90 C64 46, 90 30, 120 30 C150 30, 176 46, 174 90 C168 72, 156 64, 142 74 C128 60, 108 60, 94 76 C84 68, 74 74, 66 90 Z" />
                <path d="M66 84 C60 108, 64 130, 74 136 C71 120, 72 102, 75 88 Z" />
                <path d="M174 84 C180 108, 176 130, 166 136 C169 120, 168 102, 165 88 Z" />
              </>
            )}

            {(hairStyle === 'braids' ||
              hairStyle === 'high_ponytail' ||
              hairStyle === 'twin_tails') && (
              <>
                <path d="M67 88 C65 46, 90 30, 120 30 C150 30, 175 46, 173 88 C168 74, 158 68, 150 82 C142 66, 128 62, 120 78 C112 62, 98 66, 90 82 C82 68, 72 74, 67 88 Z" />
                <path d="M67 84 C63 102, 66 116, 73 120 C70 108, 71 96, 74 86 Z" />
                <path d="M173 84 C177 102, 174 116, 167 120 C170 108, 169 96, 166 86 Z" />
              </>
            )}
          </g>

          {/* Consistent upper-left morning hair shine */}
          <path
            d="M84 50 Q104 40 124 44"
            fill="none"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* TRADITIONAL CA DONG HAIR ACCESSORIES */}
          {accessory === 'brocade_headband' && (
            <g>
              <path
                d="M74 60 Q120 45 166 60 L163 68.5 Q120 54 77 68.5 Z"
                fill={CADONG_RED}
                stroke={line}
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              {[92, 106, 120, 134, 148].map((hx, idx) => (
                <polygon
                  key={hx}
                  points={`${hx},${56 + Math.abs(idx - 2) * 1.4} ${hx + 3},${59 + Math.abs(idx - 2) * 1.4} ${hx},${62 + Math.abs(idx - 2) * 1.4} ${hx - 3},${59 + Math.abs(idx - 2) * 1.4}`}
                  fill={idx % 2 === 0 ? CADONG_GOLD : CADONG_WHITE}
                />
              ))}
            </g>
          )}

          {accessory === 'red_ribbon' && (
            <g transform="translate(154, 56) rotate(18)">
              <path d="M0 0 L-10 -6 L-10 6 Z" fill={CADONG_RED} stroke={line} strokeWidth="1.3" />
              <path d="M0 0 L10 -6 L10 6 Z" fill={CADONG_RED} stroke={line} strokeWidth="1.3" />
              <circle cx="0" cy="0" r="3" fill={CADONG_GOLD} stroke={line} strokeWidth="1.1" />
            </g>
          )}

          {accessory === 'flower_clip' && (
            <g transform="translate(82, 62)">
              {[0, 72, 144, 216, 288].map((deg) => (
                <ellipse
                  key={deg}
                  cx="0"
                  cy="-5"
                  rx="3"
                  ry="4.8"
                  fill={CADONG_WHITE}
                  stroke="#d97706"
                  strokeWidth="0.9"
                  transform={`rotate(${deg})`}
                />
              ))}
              <circle cx="0" cy="0" r="2.8" fill={CADONG_GOLD} />
            </g>
          )}

          {accessory === 'gold_bead_pin' && (
            <g transform="translate(152, 66) rotate(-14)">
              <rect x="-8" y="-2.5" width="16" height="5" rx="2.5" fill={CADONG_RED} stroke={line} strokeWidth="1.1" />
              <circle cx="-4" cy="0" r="1.7" fill={CADONG_GOLD} />
              <circle cx="0" cy="0" r="1.7" fill={CADONG_WHITE} />
              <circle cx="4" cy="0" r="1.7" fill={CADONG_GOLD} />
            </g>
          )}
        </g>
      </g>
    </svg>
  );
};
