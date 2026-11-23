import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Flower2, Sparkles, Users, X } from 'lucide-react';
import {
  CHIBI_PRESETS,
  FEMALE_PRESETS,
  getChibiPreset,
  HAIR_STYLE_LABELS,
  MALE_PRESETS,
} from '../data/chibiCatalog';
import { ChibiAction, ChibiExpression, ChibiPreset, Student, StudentGender } from '../types';
import { ChibiCharacterSVG } from './ChibiCharacterSVG';

interface ChibiShowcaseModalProps {
  isOpen: boolean;
  initialMode?: 'class' | 'catalog';
  student: Student | null;
  students: Student[];
  onSelectStudent: (student: Student) => void;
  onClose: () => void;
}

const POSE_OPTIONS: {
  id: ChibiAction;
  label: string;
}[] = [
  { id: 'idle', label: 'Đứng tự nhiên' },
  { id: 'run', label: 'Chạy đến trường' },
  { id: 'pick_flower', label: 'Hái hoa rừng' },
  { id: 'catch_butterfly', label: 'Bắt bướm' },
  { id: 'wave_greet', label: 'Vẫy tay chào' },
  { id: 'bow_greet', label: 'Cúi đầu chào' },
];

const EXPRESSION_OPTIONS: {
  id: ChibiExpression;
  label: string;
}[] = [
  { id: 'happy', label: 'Vui vẻ' },
  { id: 'surprised', label: 'Ngạc nhiên' },
  { id: 'sad', label: 'Buồn nhẹ' },
  { id: 'curious', label: 'Tò mò' },
  { id: 'thinking', label: 'Suy nghĩ' },
  { id: 'waving', label: 'Hào hứng' },
  { id: 'running', label: 'Năng động' },
];

const BROCADE_LABELS: Record<ChibiPreset['brocadeVariant'], string> = {
  classic_diamond: 'Hoa văn quả trám Ca Dong',
  zigzag_mountain: 'Hoa văn răng cưa đại ngàn',
  royal_stripe: 'Hoa văn dệt sọc truyền thống',
};

export const ChibiShowcaseModal: React.FC<ChibiShowcaseModalProps> = ({
  isOpen,
  initialMode = 'class',
  student,
  students,
  onSelectStudent,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<'class' | 'catalog'>(initialMode);
  const [genderFilter, setGenderFilter] = useState<'all' | StudentGender>('all');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(CHIBI_PRESETS[0].id);
  const [pose, setPose] = useState<ChibiAction>('idle');
  const [expression, setExpression] = useState<ChibiExpression>('happy');
  const [holdingFlower, setHoldingFlower] = useState(false);
  const [bgMode, setBgMode] = useState<'white' | 'transparent'>('white');
  const [animTime, setAnimTime] = useState(0);

  // Sync mode when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (initialMode === 'class' && students.length > 0) {
      setViewMode('class');
      if (!student && students[0]) {
        onSelectStudent(students[0]);
      }
    } else {
      setViewMode('catalog');
    }
  }, [isOpen, initialMode, students.length]);

  const activeStudent = useMemo(() => {
    if (students.length === 0) return null;
    if (student) {
      return students.find((s) => s.id === student.id) ?? student;
    }
    return students[0];
  }, [student, students]);

  const filteredPresets = useMemo(() => {
    if (genderFilter === 'male') return MALE_PRESETS;
    if (genderFilter === 'female') return FEMALE_PRESETS;
    return CHIBI_PRESETS;
  }, [genderFilter]);

  const activeCatalogPreset = useMemo(() => {
    return (
      filteredPresets.find((p) => p.id === selectedPresetId) ??
      filteredPresets[0] ??
      CHIBI_PRESETS[0]
    );
  }, [filteredPresets, selectedPresetId]);

  const displayPreset: ChibiPreset = useMemo(() => {
    if (viewMode === 'class' && activeStudent) {
      return getChibiPreset(
        activeStudent.presetId,
        activeStudent.gender,
        activeStudent.hairStyle,
      );
    }
    return activeCatalogPreset;
  }, [viewMode, activeStudent, activeCatalogPreset]);

  useEffect(() => {
    if (!isOpen) return;
    let rafId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setAnimTime((now - start) / 1000);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isClassView = viewMode === 'class' && activeStudent !== null;
  const studentIdx = activeStudent
    ? students.findIndex((s) => s.id === activeStudent.id)
    : -1;
  const catalogIdx = filteredPresets.findIndex(
    (p) => p.id === activeCatalogPreset.id,
  );

  const handleStep = (delta: number) => {
    if (isClassView) {
      if (students.length <= 1) return;
      const safeIdx = studentIdx >= 0 ? studentIdx : 0;
      const nextIdx = (safeIdx + delta + students.length) % students.length;
      onSelectStudent(students[nextIdx]);
    } else {
      if (filteredPresets.length <= 1) return;
      const safeIdx = catalogIdx >= 0 ? catalogIdx : 0;
      const nextIdx =
        (safeIdx + delta + filteredPresets.length) % filteredPresets.length;
      setSelectedPresetId(filteredPresets[nextIdx].id);
    }
  };

  const titleText = isClassView
    ? activeStudent.name
    : `Mẫu #${String(displayPreset.index).padStart(2, '0')} · ${
        displayPreset.gender === 'female' ? 'Học sinh Nữ' : 'Học sinh Nam'
      }`;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-stone-950/75 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chibi-showcase-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-3.5 bg-amber-50/80 border-b border-amber-200 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
              style={{ backgroundColor: displayPreset.backpackColor }}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="chibi-showcase-title"
                className="font-display text-base sm:text-xl font-extrabold text-stone-900 truncate"
              >
                {titleText}
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 truncate">
                {displayPreset.gender === 'female' ? 'Nữ' : 'Nam'} · {displayPreset.age} tuổi ·{' '}
                {HAIR_STYLE_LABELS[displayPreset.hairStyle]} ·{' '}
                {BROCADE_LABELS[displayPreset.brocadeVariant]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Mode switcher */}
            <div
              className="flex items-center gap-1 p-1 rounded-xl bg-white border border-stone-200"
              role="group"
              aria-label="Chế độ xem nhân vật"
            >
              {students.length > 0 && (
                <button
                  type="button"
                  onClick={() => setViewMode('class')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                    isClassView
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Học sinh lớp ({students.length})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewMode('catalog')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                  !isClassView
                    ? 'bg-red-700 text-white'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>30 mẫu Chibi</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleStep(-1)}
              className="w-9 h-9 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 flex items-center justify-center cursor-pointer"
              aria-label="Nhân vật trước"
              title="Nhân vật trước"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => handleStep(1)}
              className="w-9 h-9 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 flex items-center justify-center cursor-pointer"
              aria-label="Nhân vật tiếp theo"
              title="Nhân vật tiếp theo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-600 hover:bg-amber-200/70 hover:text-stone-900 cursor-pointer"
              aria-label="Đóng xem Chibi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Full-Body Preview Frame — Zero Text/Logo Inside */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div
                className="w-full max-w-[272px] aspect-[272/346] rounded-2xl border border-stone-200 shadow-inner flex items-center justify-center p-2 overflow-hidden"
                style={
                  bgMode === 'white'
                    ? { backgroundColor: '#ffffff' }
                    : {
                        backgroundColor: '#f8fafc',
                        backgroundImage:
                          'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
                        backgroundSize: '20px 20px',
                        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                      }
                }
              >
                <ChibiCharacterSVG
                  student={isClassView ? activeStudent : undefined}
                  preset={!isClassView ? activeCatalogPreset : undefined}
                  expression={expression}
                  action={pose}
                  holdingFlower={holdingFlower || pose === 'pick_flower'}
                  animTime={animTime}
                  className="w-full h-full"
                />
              </div>

              <div className="mt-3 text-xs text-stone-600 font-medium text-center tabular-nums">
                {isClassView
                  ? `Học sinh ${studentIdx + 1}/${students.length} · Trang phục thổ cẩm Ca Dong & khăn quàng đỏ`
                  : `Mẫu ${catalogIdx + 1}/${filteredPresets.length} · 15 Nam & 15 Nữ riêng biệt (8–14 tuổi)`}
              </div>
            </div>

            {/* Poses, Expressions & Display Controls */}
            <div className="lg:col-span-7 space-y-4">
              {/* 6 Poses */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                  6 Tư thế hoạt động
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {POSE_OPTIONS.map((opt) => {
                    const active = pose === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPose(opt.id)}
                        className={`px-3 py-2 rounded-xl border text-xs sm:text-sm font-semibold text-left transition-colors cursor-pointer whitespace-nowrap ${
                          active
                            ? 'bg-red-50 border-red-400 text-red-900 ring-2 ring-red-200'
                            : 'bg-white border-stone-200 text-stone-700 hover:border-stone-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 7 Expressions */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                  7 Biểu cảm gương mặt
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {EXPRESSION_OPTIONS.map((opt) => {
                    const active = expression === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setExpression(opt.id)}
                        className={`px-3 py-2 rounded-xl border text-xs sm:text-sm font-semibold text-center transition-colors cursor-pointer whitespace-nowrap ${
                          active
                            ? 'bg-amber-50 border-amber-400 text-amber-950 ring-2 ring-amber-200'
                            : 'bg-white border-stone-200 text-stone-700 hover:border-stone-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Flower + Background toggles */}
              <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => setHoldingFlower((v) => !v)}
                  className={`px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                    holdingFlower || pose === 'pick_flower'
                      ? 'bg-amber-50 border-amber-400 text-amber-900'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <Flower2 className="w-4 h-4" />
                  <span>
                    {holdingFlower || pose === 'pick_flower'
                      ? 'Đang cầm hoa rừng'
                      : 'Cầm hoa rừng'}
                  </span>
                </button>

                <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 border border-stone-200">
                  <button
                    type="button"
                    onClick={() => setBgMode('white')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
                      bgMode === 'white'
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Nền trắng
                  </button>
                  <button
                    type="button"
                    onClick={() => setBgMode('transparent')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
                      bgMode === 'transparent'
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Trong suốt
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 30-Character Catalog Browser Grid */}
          {!isClassView && (
            <div className="pt-4 border-t border-stone-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-stone-900">
                  Bộ sưu tập 30 học sinh Ca Dong (8–14 tuổi)
                </p>

                <div
                  className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 border border-stone-200"
                  role="group"
                  aria-label="Lọc giới tính"
                >
                  {(
                    [
                      { id: 'all', label: 'Tất cả (30)' },
                      { id: 'male', label: 'Nam (15)' },
                      { id: 'female', label: 'Nữ (15)' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setGenderFilter(tab.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                        genderFilter === tab.id
                          ? 'bg-white text-stone-900 shadow-sm'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
                {filteredPresets.map((preset) => {
                  const selected = preset.id === activeCatalogPreset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedPresetId(preset.id)}
                      className={`p-2 rounded-xl border text-center flex flex-col items-center transition-colors cursor-pointer ${
                        selected
                          ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-300/70'
                          : 'bg-white border-stone-200 hover:border-stone-400'
                      }`}
                    >
                      <div className="w-16 aspect-[272/346] flex items-center justify-center pointer-events-none">
                        <ChibiCharacterSVG
                          preset={preset}
                          expression="happy"
                          action="idle"
                          className="w-full h-full"
                        />
                      </div>
                      <span className="mt-1 text-xs font-bold text-stone-900 tabular-nums whitespace-nowrap">
                        #{String(preset.index).padStart(2, '0')} ·{' '}
                        {preset.gender === 'female' ? 'Nữ' : 'Nam'}
                      </span>
                      <span className="text-[11px] text-stone-600 truncate w-full">
                        {HAIR_STYLE_LABELS[preset.hairStyle]} · {preset.age}t
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
