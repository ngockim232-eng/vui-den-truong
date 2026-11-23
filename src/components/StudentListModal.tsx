import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Eraser,
  FolderPlus,
  ListPlus,
  Pencil,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  cyclePresetForGender,
  FEMALE_PRESETS,
  getChibiPreset,
  HAIR_STYLE_LABELS,
  MALE_PRESETS,
  parseNameAndGender,
} from '../data/chibiCatalog';
import {
  buildStudentsWithUniquePresets,
  DEFAULT_STUDENTS,
  SAMPLE_30_CLASS_NAMES,
} from '../data/defaultStudents';
import { Classroom, Student, StudentGender } from '../types';
import { ChibiCharacterSVG } from './ChibiCharacterSVG';

interface StudentListModalProps {
  isOpen: boolean;
  onClose: () => void;
  classrooms: Classroom[];
  activeClassId: string;
  onSelectClass: (classId: string) => void;
  onCreateClass: (name: string) => void;
  onRenameClass: (classId: string, newName: string) => void;
  onDeleteClass: (classId: string) => void;
  onSaveClassStudents: (classId: string, nextStudents: Student[]) => void;
  onResetRound: () => void;
}

interface ParsedStudentRow {
  rowKey: string;
  name: string;
  gender: StudentGender;
  presetId: string;
  existing?: Student;
}

function splitRawLines(rawText: string): string[] {
  if (!rawText.trim()) return [];
  return rawText
    .split(/[\r\n,;\t]+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export const StudentListModal: React.FC<StudentListModalProps> = ({
  isOpen,
  onClose,
  classrooms,
  activeClassId,
  onSelectClass,
  onCreateClass,
  onRenameClass,
  onDeleteClass,
  onSaveClassStudents,
  onResetRound,
}) => {
  const activeClass = useMemo(
    () => classrooms.find((c) => c.id === activeClassId) ?? classrooms[0],
    [classrooms, activeClassId],
  );

  const [bulkText, setBulkText] = useState('');
  const [genderOverrides, setGenderOverrides] = useState<
    Record<string, StudentGender>
  >({});
  const [presetOverrides, setPresetOverrides] = useState<
    Record<string, string>
  >({});

  // Class management inline UI states (zero window.alert / window.confirm)
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [classFormError, setClassFormError] = useState<string | null>(null);

  const [isRenamingClass, setIsRenamingClass] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Sync editor whenever modal opens or user switches active class
  useEffect(() => {
    if (!isOpen || !activeClass) return;
    setBulkText(activeClass.students.map((s) => s.name).join('\n'));
    setGenderOverrides({});
    setPresetOverrides({});
    setIsRenamingClass(false);
    setConfirmDeleteId(null);
    setClassFormError(null);
  }, [isOpen, activeClass?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCreatingClass) {
          setIsCreatingClass(false);
          setClassFormError(null);
          return;
        }
        if (isRenamingClass) {
          setIsRenamingClass(false);
          setClassFormError(null);
          return;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isCreatingClass, isRenamingClass, onClose]);

  const parsedRows: ParsedStudentRow[] = useMemo(() => {
    if (!activeClass) return [];
    const lines = splitRawLines(bulkText);
    const existingByName = new Map<string, Student>();
    activeClass.students.forEach((s) => {
      existingByName.set(s.name.trim().toLowerCase(), s);
    });

    const occurrenceCounter = new Map<string, number>();
    let maleCursor = 0;
    let femaleCursor = 0;

    const rows: ParsedStudentRow[] = [];

    for (const line of lines) {
      const parsed = parseNameAndGender(line);
      if (!parsed.name) continue;
      const normName = parsed.name.toLowerCase();
      const occ = occurrenceCounter.get(normName) ?? 0;
      occurrenceCounter.set(normName, occ + 1);
      const rowKey = `${normName}::${occ}`;

      const existing = occ === 0 ? existingByName.get(normName) : undefined;

      let gender: StudentGender;
      if (genderOverrides[rowKey]) {
        gender = genderOverrides[rowKey];
      } else if (parsed.explicit) {
        gender = parsed.gender;
      } else if (existing) {
        gender = existing.gender;
      } else {
        gender = parsed.gender;
      }

      const pool = gender === 'female' ? FEMALE_PRESETS : MALE_PRESETS;
      const cursor = gender === 'female' ? femaleCursor++ : maleCursor++;

      let preferredPresetId: string | undefined = presetOverrides[rowKey];
      if (!preferredPresetId && existing && existing.gender === gender) {
        preferredPresetId = existing.presetId;
      }
      if (preferredPresetId && !pool.some((p) => p.id === preferredPresetId)) {
        preferredPresetId = undefined;
      }
      const presetId = preferredPresetId ?? pool[cursor % pool.length].id;

      rows.push({
        rowKey,
        name: parsed.name,
        gender,
        presetId,
        existing,
      });
    }

    return rows;
  }, [bulkText, activeClass, genderOverrides, presetOverrides]);

  const maleCount = useMemo(
    () => parsedRows.filter((r) => r.gender === 'male').length,
    [parsedRows],
  );
  const femaleCount = parsedRows.length - maleCount;

  if (!isOpen || !activeClass) return null;

  const handleToggleGender = (row: ParsedStudentRow) => {
    const nextGender: StudentGender = row.gender === 'male' ? 'female' : 'male';
    setGenderOverrides((prev) => ({ ...prev, [row.rowKey]: nextGender }));
    // Clear preset override so the row picks a clean matching preset for the new gender
    setPresetOverrides((prev) => {
      if (!(row.rowKey in prev)) return prev;
      const copy = { ...prev };
      delete copy[row.rowKey];
      return copy;
    });
  };

  const handleCyclePreset = (row: ParsedStudentRow) => {
    const nextPreset = cyclePresetForGender(row.presetId, row.gender);
    setPresetOverrides((prev) => ({ ...prev, [row.rowKey]: nextPreset.id }));
  };

  const handleSaveAndShow = () => {
    if (parsedRows.length === 0) return;

    const nextStudents = buildStudentsWithUniquePresets(
      parsedRows.map((row) => ({
        name: row.name,
        gender: row.gender,
        existing: row.existing,
        preferredPresetId: row.presetId,
      })),
    );

    onSaveClassStudents(activeClass.id, nextStudents);
    onClose();
  };

  const handleLoadSample12 = () => {
    setGenderOverrides({});
    setPresetOverrides({});
    setBulkText(DEFAULT_STUDENTS.map((s) => s.name).join('\n'));
  };

  const handleLoadSample30 = () => {
    setGenderOverrides({});
    setPresetOverrides({});
    setBulkText(SAMPLE_30_CLASS_NAMES.map((s) => s.name).join('\n'));
  };

  const handleCreateClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newClassName.trim();
    if (!trimmed) {
      setClassFormError('Vui lòng nhập tên lớp mới.');
      return;
    }
    const duplicate = classrooms.some(
      (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      setClassFormError(`Lớp “${trimmed}” đã tồn tại, hãy đặt tên khác.`);
      return;
    }
    onCreateClass(trimmed);
    setNewClassName('');
    setIsCreatingClass(false);
    setClassFormError(null);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setClassFormError('Tên lớp không được để trống.');
      return;
    }
    const duplicate = classrooms.some(
      (c) =>
        c.id !== activeClass.id &&
        c.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      setClassFormError(`Tên lớp “${trimmed}” đã trùng với lớp khác.`);
      return;
    }
    onRenameClass(activeClass.id, trimmed);
    setIsRenamingClass(false);
    setClassFormError(null);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/75 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="roster-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-3.5 bg-amber-50 border-b border-amber-200 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
              <ListPlus className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="roster-title"
                className="font-display text-lg sm:text-xl font-extrabold text-stone-900 truncate"
              >
                Quản Lý Lớp &amp; Nhập Nhanh Học Sinh
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 truncate">
                Lưu trực tiếp trên trình duyệt · Tự nhận diện Nam/Nữ và bấm đổi nhanh
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-600 hover:bg-amber-200/60 hover:text-stone-900 transition-colors cursor-pointer shrink-0"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Saved Classes Switcher & Inline Class Management Bar */}
        <div className="px-5 sm:px-6 py-3 bg-stone-50 border-b border-stone-200 space-y-2.5 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider mr-1">
                Các lớp đã lưu:
              </span>
              {classrooms.map((cls) => {
                const isCurrent = cls.id === activeClass.id;
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => onSelectClass(cls.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-stone-900 text-white shadow-sm'
                        : 'bg-white border border-stone-200 text-stone-700 hover:border-stone-400'
                    }`}
                  >
                    {cls.name} ({cls.students.length})
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setIsCreatingClass((v) => !v);
                  setIsRenamingClass(false);
                  setConfirmDeleteId(null);
                  setClassFormError(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Tạo lớp mới</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setRenameValue(activeClass.name);
                  setIsRenamingClass((v) => !v);
                  setIsCreatingClass(false);
                  setConfirmDeleteId(null);
                  setClassFormError(null);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-semibold flex items-center gap-1 whitespace-nowrap cursor-pointer"
                title="Đổi tên lớp hiện tại"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Đổi tên</span>
              </button>

              {classrooms.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDeleteId(activeClass.id);
                    setIsCreatingClass(false);
                    setIsRenamingClass(false);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-red-200 hover:bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-1 whitespace-nowrap cursor-pointer"
                  title="Xóa lớp hiện tại"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa lớp</span>
                </button>
              )}
            </div>
          </div>

          {/* Inline Create Class Form */}
          {isCreatingClass && (
            <form
              onSubmit={handleCreateClassSubmit}
              className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200"
            >
              <input
                type="text"
                value={newClassName}
                onChange={(e) => {
                  setNewClassName(e.target.value);
                  setClassFormError(null);
                }}
                placeholder="Nhập tên lớp mới (VD: Lớp 5A, Lớp 6B, Tổ 1...)"
                className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Tạo lớp</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingClass(false);
                  setClassFormError(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer"
              >
                Hủy
              </button>
            </form>
          )}

          {/* Inline Rename Class Form */}
          {isRenamingClass && (
            <form
              onSubmit={handleRenameSubmit}
              className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200"
            >
              <input
                type="text"
                value={renameValue}
                onChange={(e) => {
                  setRenameValue(e.target.value);
                  setClassFormError(null);
                }}
                placeholder="Nhập tên mới cho lớp"
                className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                autoFocus
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Lưu tên lớp</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRenamingClass(false);
                  setClassFormError(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer"
              >
                Hủy
              </button>
            </form>
          )}

          {/* Inline Delete Confirmation */}
          {confirmDeleteId === activeClass.id && classrooms.length > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm">
              <span className="font-semibold text-red-900">
                Thầy/cô có chắc muốn xóa lớp “{activeClass.name}” ({activeClass.students.length} học sinh) không?
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onDeleteClass(activeClass.id);
                    setConfirmDeleteId(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold whitespace-nowrap cursor-pointer"
                >
                  Xác nhận xóa
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 text-xs font-semibold whitespace-nowrap cursor-pointer"
                >
                  Giữ lại
                </button>
              </div>
            </div>
          )}

          {classFormError && (
            <p className="text-xs font-semibold text-red-600">{classFormError}</p>
          )}
        </div>

        {/* Main Body: Quick Bulk Input + Live Gender/Chibi Preview */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 custom-scrollbar">
          {/* Quick Utility Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setBulkText('');
                  setGenderOverrides({});
                  setPresetOverrides({});
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 font-semibold whitespace-nowrap cursor-pointer"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Xóa trắng để dán mới</span>
              </button>

              <button
                type="button"
                onClick={handleLoadSample12}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Mẫu 12 em</span>
              </button>

              <button
                type="button"
                onClick={handleLoadSample30}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200/80 text-amber-950 font-bold whitespace-nowrap cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Mẫu 30 em (15 Nam · 15 Nữ)</span>
              </button>
            </div>

            {activeClass.calledIds.length > 0 && (
              <button
                type="button"
                onClick={onResetRound}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 font-semibold whitespace-nowrap cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Làm mới lượt gọi ({activeClass.calledIds.length})</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left: Quick Bulk Textarea */}
            <div className="lg:col-span-5 space-y-2">
              <label
                htmlFor="bulk-student-textarea"
                className="block text-xs sm:text-sm font-bold text-stone-800"
              >
                Danh sách lớp “{activeClass.name}” (mỗi em 1 dòng)
              </label>
              <textarea
                id="bulk-student-textarea"
                rows={11}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={
                  'Dán hoặc gõ tên cả lớp, ví dụ:\n1. Hồ Văn Tùng\n2. Hồ Thị Mai\n3. Đinh Văn Nam - Nam\n4. Đinh Thị Lan (Nữ)'
                }
                className="w-full p-3 rounded-xl bg-white border border-stone-300 text-stone-900 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500"
                autoFocus
              />
              <p className="text-xs text-stone-500 leading-relaxed">
                Hệ thống tự bỏ số thứ tự và tự nhận diện giới tính <span className="font-semibold text-stone-700">Nam / Nữ</span> theo tên (hoặc thêm <span className="font-semibold text-stone-700">- Nam</span> / <span className="font-semibold text-stone-700">- Nữ</span>). Nhấn nút bên phải để đổi nhanh giới tính hoặc kiểu Chibi.
              </p>
            </div>

            {/* Right: Live Parsed Preview with 1-Click Gender Toggle & Chibi Preview */}
            <div className="lg:col-span-7 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                {parsedRows.length > 0 ? (
                  <p className="font-bold text-stone-800 tabular-nums">
                    Đã nhận diện {parsedRows.length} học sinh ·{' '}
                    <span className="text-sky-700">{maleCount} Nam</span> ·{' '}
                    <span className="text-rose-700">{femaleCount} Nữ</span>
                  </p>
                ) : (
                  <p className="font-semibold text-red-600">
                    Chưa có học sinh nào — hãy nhập hoặc dán danh sách bên trái.
                  </p>
                )}
              </div>

              {parsedRows.length > 0 && (
                <div className="max-h-[320px] overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2 custom-scrollbar">
                  {parsedRows.map((row, idx) => {
                    const preset = getChibiPreset(row.presetId, row.gender, idx);
                    const isFemale = row.gender === 'female';
                    return (
                      <div
                        key={row.rowKey}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl bg-stone-50 border border-stone-200 hover:border-stone-300 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-bold text-stone-400 tabular-nums w-5 text-right shrink-0">
                            {idx + 1}.
                          </span>

                          {/* Clickable Chibi preview to cycle character preset */}
                          <button
                            type="button"
                            onClick={() => handleCyclePreset(row)}
                            title="Nhấn để đổi mẫu Chibi Ca Dong khác"
                            className="relative w-10 h-11 rounded-lg bg-white border border-stone-200 hover:border-amber-400 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer group"
                          >
                            <ChibiCharacterSVG
                              preset={preset}
                              expression="happy"
                              action="idle"
                              className="w-10 h-12 translate-y-1 pointer-events-none"
                            />
                            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-white/90 rounded-tl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <RefreshCw className="w-2.5 h-2.5 text-amber-700" />
                            </span>
                          </button>

                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                              {row.name}
                            </p>
                            <p className="text-[11px] text-stone-500 truncate">
                              {HAIR_STYLE_LABELS[preset.hairStyle]} · {preset.age}t
                            </p>
                          </div>
                        </div>

                        {/* 1-Click Gender Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleGender(row)}
                          title="Nhấn để đổi giới tính Nam / Nữ"
                          className={`px-2.5 py-1.5 rounded-lg border text-xs font-extrabold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                            isFemale
                              ? 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-800'
                              : 'bg-sky-50 hover:bg-sky-100 border-sky-300 text-sky-800'
                          }`}
                        >
                          {isFemale ? 'Nữ' : 'Nam'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 font-semibold text-sm cursor-pointer whitespace-nowrap"
          >
            Đóng
          </button>

          <button
            type="button"
            disabled={parsedRows.length === 0}
            onClick={handleSaveAndShow}
            className="px-5 sm:px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 text-white font-bold text-sm flex items-center gap-2 cursor-pointer shadow-sm transition-colors whitespace-nowrap"
          >
            <Save className="w-4 h-4" />
            <span>
              Lưu lớp “{activeClass.name}” ({parsedRows.length} em)
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
