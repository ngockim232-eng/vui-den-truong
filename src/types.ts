export type StudentGender = 'male' | 'female';

export type ChibiHairStyle =
  | 'short'
  | 'bangs'
  | 'shoulder'
  | 'braids'
  | 'high_ponytail'
  | 'twin_tails';

export type ChibiBrocadeVariant = 'classic_diamond' | 'zigzag_mountain' | 'royal_stripe';

export type ChibiAccessory =
  | 'none'
  | 'brocade_headband'
  | 'red_ribbon'
  | 'flower_clip'
  | 'gold_bead_pin';

export interface ChibiPreset {
  id: string;
  index: number; // 1..30
  label: string;
  gender: StudentGender;
  age: number; // 8..14
  hairStyle: ChibiHairStyle;
  hairColor: string;
  hairHighlight: string;
  eyeColor: string;
  skinTone: 'fair' | 'warm' | 'sunlit';
  brocadeVariant: ChibiBrocadeVariant;
  tunicBase: string;
  backpackColor: string;
  backpackTrim: string;
  accessory: ChibiAccessory;
  neckStyle: 'round' | 'v_neck';
}

export type ChibiExpression =
  | 'happy'
  | 'surprised'
  | 'sad'
  | 'curious'
  | 'thinking'
  | 'waving'
  | 'running';

export type ChibiAction =
  | 'idle'
  | 'run'
  | 'pick_flower'
  | 'catch_butterfly'
  | 'wave_greet'
  | 'bow_greet'
  | 'inside_yard'
  | 'late_caught';

export interface Student {
  id: string;
  name: string;
  gender: StudentGender;
  presetId: string;
  avatarUrl?: string;
  hairStyle: number; // legacy compatibility index 0..5
  hairColor: string;
  eyeColor: string;
  outfitColor: string;
  backpackColor: string;
  accentColor: string;
}

export interface Classroom {
  id: string;
  name: string;
  students: Student[];
  calledIds: string[];
  updatedAt: number;
}

export type GamePhase = 'idle' | 'walking' | 'closing' | 'selected';

export type SelectionMode = 'random' | 'manual';

export type WeatherMode = 'sunny' | 'light_rain' | 'foggy';

export interface DialogueScript {
  id: string;
  lines: string[];
}

export type SurpriseEventType =
  | 'wind_petals'
  | 'butterfly_swarm'
  | 'giant_flower_find'
  | 'golden_sunbeam'
  | 'quick_sprint'
  | 'teacher_greet';

export interface SurpriseEvent {
  id: string;
  type: SurpriseEventType;
  title: string;
  description: string;
  affectedStudentId?: string;
  greetStudentIds?: string[];
  greetActions?: Record<string, 'wave_greet' | 'bow_greet'>;
  isManual?: boolean;
}
