import { Classroom, DialogueScript, Student, StudentGender } from '../types';
import {
  FEMALE_PRESETS,
  getChibiPreset,
  inferGenderFromName,
  MALE_PRESETS,
} from './chibiCatalog';

const LEGACY_STUDENTS_STORAGE_KEY = 'den_truong_thoi_nao_students_v2';
const CLASSROOMS_STORAGE_KEY = 'den_truong_thoi_nao_classrooms_v3';

export interface ClassroomsStore {
  activeClassId: string;
  classes: Classroom[];
}

const HAIR_STYLE_INDEX_MAP: Record<string, number> = {
  short: 0,
  bangs: 1,
  shoulder: 2,
  braids: 3,
  high_ponytail: 4,
  twin_tails: 5,
};

export function createStudentRecord(
  name: string,
  index = 0,
  avatarUrl?: string,
  gender?: StudentGender,
  preferredPresetId?: string,
): Student {
  const cleanName = name.trim();
  const resolvedGender: StudentGender = gender ?? inferGenderFromName(cleanName);
  const preset = getChibiPreset(preferredPresetId, resolvedGender, index);

  return {
    id: `stu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${index}`,
    name: cleanName,
    gender: resolvedGender,
    presetId: preset.id,
    avatarUrl,
    hairStyle: HAIR_STYLE_INDEX_MAP[preset.hairStyle] ?? 0,
    hairColor: preset.hairColor,
    eyeColor: preset.eyeColor,
    outfitColor: preset.tunicBase,
    backpackColor: preset.backpackColor,
    accentColor: preset.backpackTrim,
  };
}

export function normalizeStudentRecord(
  raw: Partial<Student>,
  index: number,
): Student {
  const name = (raw.name || `Học sinh ${index + 1}`).trim();
  const gender: StudentGender =
    raw.gender === 'male' || raw.gender === 'female'
      ? raw.gender
      : inferGenderFromName(name);
  const preset = getChibiPreset(raw.presetId, gender, index);

  return {
    id: raw.id || `stu-mig-${index}-${Date.now()}`,
    name,
    gender,
    presetId: preset.id,
    avatarUrl: raw.avatarUrl,
    hairStyle: HAIR_STYLE_INDEX_MAP[preset.hairStyle] ?? 0,
    hairColor: preset.hairColor,
    eyeColor: preset.eyeColor,
    outfitColor: preset.tunicBase,
    backpackColor: preset.backpackColor,
    accentColor: preset.backpackTrim,
  };
}

/**
 * Assign unique non-repeating presets per gender across a student list
 * (15 distinct boy presets + 15 distinct girl presets = 30 unique students).
 */
export function buildStudentsWithUniquePresets(
  entries: {
    name: string;
    gender: StudentGender;
    existing?: Student;
    preferredPresetId?: string;
  }[],
): Student[] {
  let maleCursor = 0;
  let femaleCursor = 0;

  return entries.map((entry, idx) => {
    const pool = entry.gender === 'female' ? FEMALE_PRESETS : MALE_PRESETS;
    const cursor = entry.gender === 'female' ? femaleCursor++ : maleCursor++;

    let chosenPresetId = entry.preferredPresetId;
    if (chosenPresetId) {
      const valid = pool.some((p) => p.id === chosenPresetId);
      if (!valid) chosenPresetId = undefined;
    }

    if (!chosenPresetId) {
      chosenPresetId = pool[cursor % pool.length].id;
    }

    const preset = getChibiPreset(chosenPresetId, entry.gender, cursor);

    if (entry.existing) {
      return {
        ...entry.existing,
        name: entry.name.trim(),
        gender: entry.gender,
        presetId: preset.id,
        hairStyle: HAIR_STYLE_INDEX_MAP[preset.hairStyle] ?? 0,
        hairColor: preset.hairColor,
        eyeColor: preset.eyeColor,
        outfitColor: preset.tunicBase,
        backpackColor: preset.backpackColor,
        accentColor: preset.backpackTrim,
      };
    }

    return createStudentRecord(
      entry.name,
      idx,
      undefined,
      entry.gender,
      preset.id,
    );
  });
}

const DEFAULT_12_SAMPLE: { name: string; gender: StudentGender }[] = [
  { name: 'Hồ Văn Tùng', gender: 'male' },
  { name: 'Hồ Thị Mai', gender: 'female' },
  { name: 'Đinh Văn Nam', gender: 'male' },
  { name: 'Đinh Thị Lan', gender: 'female' },
  { name: 'Hồ Văn Hải', gender: 'male' },
  { name: 'Đinh Thị Hoa', gender: 'female' },
  { name: 'Hồ Văn Minh', gender: 'male' },
  { name: 'Hồ Thị Thu', gender: 'female' },
  { name: 'Đinh Văn Long', gender: 'male' },
  { name: 'Hồ Thị Ngọc', gender: 'female' },
  { name: 'Đinh Văn Bảo', gender: 'male' },
  { name: 'Hồ Thị Hương', gender: 'female' },
];

export const SAMPLE_30_CLASS_NAMES: { name: string; gender: StudentGender }[] = [
  { name: 'Hồ Văn Tùng', gender: 'male' },
  { name: 'Hồ Thị Mai', gender: 'female' },
  { name: 'Đinh Văn Nam', gender: 'male' },
  { name: 'Đinh Thị Lan', gender: 'female' },
  { name: 'Hồ Văn Hải', gender: 'male' },
  { name: 'Đinh Thị Hoa', gender: 'female' },
  { name: 'Hồ Văn Minh', gender: 'male' },
  { name: 'Hồ Thị Thu', gender: 'female' },
  { name: 'Đinh Văn Long', gender: 'male' },
  { name: 'Hồ Thị Ngọc', gender: 'female' },
  { name: 'Đinh Văn Bảo', gender: 'male' },
  { name: 'Hồ Thị Hương', gender: 'female' },
  { name: 'Hồ Văn Quân', gender: 'male' },
  { name: 'Đinh Thị Linh', gender: 'female' },
  { name: 'Đinh Văn Khang', gender: 'male' },
  { name: 'Hồ Thị Trang', gender: 'female' },
  { name: 'Hồ Văn Đức', gender: 'male' },
  { name: 'Đinh Thị Thảo', gender: 'female' },
  { name: 'Đinh Văn Tuấn', gender: 'male' },
  { name: 'Hồ Thị Yến', gender: 'female' },
  { name: 'Hồ Văn Hùng', gender: 'male' },
  { name: 'Đinh Thị Nhung', gender: 'female' },
  { name: 'Đinh Văn Kiên', gender: 'male' },
  { name: 'Hồ Thị Quỳnh', gender: 'female' },
  { name: 'Hồ Văn Phúc', gender: 'male' },
  { name: 'Đinh Thị Vy', gender: 'female' },
  { name: 'Đinh Văn Hoàng', gender: 'male' },
  { name: 'Hồ Thị Ngân', gender: 'female' },
  { name: 'Hồ Văn Phong', gender: 'male' },
  { name: 'Đinh Thị Trâm', gender: 'female' },
];

export const DEFAULT_STUDENTS: Student[] = buildStudentsWithUniquePresets(
  DEFAULT_12_SAMPLE,
);

export function createClassroomRecord(
  name: string,
  students: Student[] = [],
): Classroom {
  return {
    id: `cls-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || 'Lớp mới',
    students,
    calledIds: [],
    updatedAt: Date.now(),
  };
}

export function loadClassroomsStore(): ClassroomsStore {
  try {
    const raw = localStorage.getItem(CLASSROOMS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ClassroomsStore>;
      if (Array.isArray(parsed.classes) && parsed.classes.length > 0) {
        const classes: Classroom[] = parsed.classes.map((cls, cIdx) => {
          const normalizedStudents = Array.isArray(cls.students)
            ? cls.students.map((s, sIdx) => normalizeStudentRecord(s, sIdx))
            : [];
          const validIds = new Set(normalizedStudents.map((s) => s.id));
          const calledIds = Array.isArray(cls.calledIds)
            ? cls.calledIds.filter((id) => validIds.has(id))
            : [];
          return {
            id: cls.id || `cls-mig-${cIdx}-${Date.now()}`,
            name: (cls.name || `Lớp ${cIdx + 1}`).trim(),
            students: normalizedStudents,
            calledIds,
            updatedAt: typeof cls.updatedAt === 'number' ? cls.updatedAt : Date.now(),
          };
        });
        const activeClassId =
          parsed.activeClassId && classes.some((c) => c.id === parsed.activeClassId)
            ? parsed.activeClassId
            : classes[0].id;
        return { activeClassId, classes };
      }
    }
  } catch {
    // Ignore parse errors
  }

  // Migrate legacy single-roster storage seamlessly into first default classroom
  let migratedStudents: Student[] = DEFAULT_STUDENTS;
  try {
    const legacyRaw = localStorage.getItem(LEGACY_STUDENTS_STORAGE_KEY);
    if (legacyRaw) {
      const legacyParsed = JSON.parse(legacyRaw) as Partial<Student>[];
      if (Array.isArray(legacyParsed) && legacyParsed.length > 0) {
        migratedStudents = buildStudentsWithUniquePresets(
          legacyParsed.map((item, idx) => {
            const norm = normalizeStudentRecord(item, idx);
            return {
              name: norm.name,
              gender: norm.gender,
              existing: norm,
            };
          }),
        );
      }
    }
  } catch {
    // Fallback to DEFAULT_STUDENTS
  }

  const initialClass = createClassroomRecord('Lớp của tôi', migratedStudents);
  return {
    activeClassId: initialClass.id,
    classes: [initialClass],
  };
}

export function saveClassroomsStore(store: ClassroomsStore) {
  try {
    localStorage.setItem(CLASSROOMS_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore quota errors
  }
}

export const ROAD_DIALOGUE_SCRIPTS: DialogueScript[] = [
  {
    id: 'script-flowers',
    lines: [
      'Ôi! Dọc đường hôm nay nở nhiều hoa dã quỳ đẹp quá!',
      'Đợi mình hái một bông hoa vàng xinh tặng cô giáo nhé!',
      'Nhanh chân lên bạn ơi, sắp đến giờ vào lớp rồi!',
    ],
  },
  {
    id: 'script-butterfly',
    lines: [
      'Nhìn kìa, đàn bướm sặc sỡ đang bay quanh khóm hoa!',
      'Mình thử giơ tay bắt nhẹ một chú bướm xem sao!',
      'Cẩn thận kẻo chuông trường Lý Tự Trọng reo là đóng cổng đấy!',
    ],
  },
  {
    id: 'script-gate',
    lines: [
      'Các bạn ơi, cổng trường đang mở đón chúng mình kìa!',
      'Ai chạy nhanh vào sân trường trước khi chuông reo nào!',
      'Chờ mình với, mình mải ngắm hoa nên đi chậm quá!',
    ],
  },
  {
    id: 'script-quiz',
    lines: [
      'Hôm nay chúng mình sẽ cùng khởi động đầu giờ thật vui nhé!',
      'Bạn nào đến cổng trễ nhất sẽ được mời trả lời câu hỏi đấy!',
    ],
  },
];

export const CLOSING_PROMPT_TEXT =
  'Reng... reng... reng! Chuông đã reo và cổng Trường PTDTBT TH&THCS Lý Tự Trọng đã đóng lại! Xin mời bạn đến trễ cùng đứng lên chia sẻ câu trả lời của mình nhé!';
