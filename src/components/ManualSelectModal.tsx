import React from 'react';
import { Check, UserCheck, X } from 'lucide-react';
import { getChibiPreset, HAIR_STYLE_LABELS } from '../data/chibiCatalog';
import { Student } from '../types';
import { ChibiCharacterSVG } from './ChibiCharacterSVG';

interface ManualSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  selectedIds: string[];
  maxCount: number;
  onChangeSelectedIds: (ids: string[]) => void;
}

export const ManualSelectModal: React.FC<ManualSelectModalProps> = ({
  isOpen,
  onClose,
  students,
  selectedIds,
  maxCount,
  onChangeSelectedIds,
}) => {
  if (!isOpen) return null;

  const toggleStudent = (id: string) => {
    if (selectedIds.includes(id)) {
      onChangeSelectedIds(selectedIds.filter((item) => item !== id));
      return;
    }
    if (selectedIds.length >= maxCount) {
      onChangeSelectedIds([...selectedIds.slice(1), id]);
    } else {
      onChangeSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-select-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl max-h-[84vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-4 bg-emerald-50 border-b border-emerald-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="manual-select-title"
                className="font-display text-lg sm:text-xl font-bold text-stone-900"
              >
                Tùy Chọn Học Sinh Được Gọi
              </h2>
              <p className="text-sm text-stone-600">
                Chọn {maxCount} học sinh sẽ mải hái hoa, bắt bướm và đến trễ khi cổng đóng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-600 hover:bg-emerald-200/60 cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 custom-scrollbar">
          {students.map((stu, idx) => {
            const isPicked = selectedIds.includes(stu.id);
            const preset = getChibiPreset(stu.presetId, stu.gender, idx);
            return (
              <button
                key={stu.id}
                type="button"
                onClick={() => toggleStudent(stu.id)}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  isPicked
                    ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-400/50'
                    : 'bg-white border-stone-200 hover:border-stone-400'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {stu.avatarUrl ? (
                    <img
                      src={stu.avatarUrl}
                      alt={stu.name}
                      className="w-10 h-10 rounded-full object-cover border border-stone-200 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 overflow-hidden flex items-center justify-center shrink-0">
                      <div className="w-11 h-14 translate-y-2 pointer-events-none">
                        <ChibiCharacterSVG student={stu} expression="happy" />
                      </div>
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="block font-semibold text-stone-900 truncate">
                      {stu.name}
                    </span>
                    <span className="block text-xs text-stone-500 truncate">
                      {stu.gender === 'female' ? 'Nữ' : 'Nam'} ·{' '}
                      {HAIR_STYLE_LABELS[preset.hairStyle]}
                    </span>
                  </div>
                </div>

                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                    isPicked
                      ? 'bg-amber-500 text-stone-950'
                      : 'border border-stone-300 bg-stone-50'
                  }`}
                >
                  {isPicked && <Check className="w-4 h-4 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-6 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
          <span className="text-sm font-medium text-stone-600 tabular-nums">
            Đã chọn: {selectedIds.length}/{maxCount} học sinh
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm cursor-pointer whitespace-nowrap"
          >
            Xác nhận lựa chọn
          </button>
        </div>
      </div>
    </div>
  );
};
