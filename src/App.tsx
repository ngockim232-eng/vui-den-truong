import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BellRing,
  ChevronDown,
  ChevronUp,
  Clock,
  CloudFog,
  CloudRain,
  Minus,
  Play,
  Plus,
  RotateCcw,
  Shuffle,
  Sparkles,
  Square,
  Sun,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ChibiCharacterSVG } from './components/ChibiCharacterSVG';
import { ChibiShowcaseModal } from './components/ChibiShowcaseModal';
import { ManualSelectModal } from './components/ManualSelectModal';
import { StudentListModal } from './components/StudentListModal';
import { VillageStage } from './components/VillageStage';
import {
  ClassroomsStore,
  CLOSING_PROMPT_TEXT,
  createClassroomRecord,
  loadClassroomsStore,
  ROAD_DIALOGUE_SCRIPTS,
  saveClassroomsStore,
} from './data/defaultStudents';
import {
  GamePhase,
  SelectionMode,
  Student,
  SurpriseEvent,
  SurpriseEventType,
  WeatherMode,
} from './types';
import { audioEngine } from './utils/audioEngine';

const TIME_OPTIONS = [10, 15, 20, 30, 45, 60] as const;

const WEATHER_OPTIONS: {
  id: WeatherMode;
  label: string;
}[] = [
  { id: 'sunny', label: 'Nắng' },
  { id: 'light_rain', label: 'Mưa nhẹ' },
  { id: 'foggy', label: 'Sương mù' },
];

const SURPRISE_TEMPLATES: {
  type: SurpriseEventType;
  title: string;
  description: string;
}[] = [
  {
    type: 'teacher_greet',
    title: 'Các bạn nhỏ dừng lại chào thầy/cô!',
    description:
      'Một vài bạn bất ngờ nhận ra thầy/cô, dừng bước lễ phép cúi chào và vẫy tay thật tươi!',
  },
  {
    type: 'butterfly_swarm',
    title: 'Bất ngờ! Đàn bướm rực rỡ bay ùa ra!',
    description:
      'Cả đàn bướm sặc sỡ bay lượn quanh đường làm các bạn thích thú ngắm nhìn!',
  },
  {
    type: 'wind_petals',
    title: 'Cơn gió núi thổi bay cánh hoa rừng!',
    description:
      'Những cánh hoa dã quỳ và hoa sim bay nhẹ khắp con đường đến trường!',
  },
  {
    type: 'giant_flower_find',
    title: 'Ồ! Phát hiện khóm hoa dã quỳ siêu to!',
    description:
      'Một bạn bất ngờ dừng lại trầm trồ trước khóm hoa nở rộ bên đường!',
  },
  {
    type: 'golden_sunbeam',
    title: 'Nắng chiều lấp lánh xuyên qua rặng núi!',
    description:
      'Ánh nắng vàng óng ả bừng sáng khiến cả bản làng lung linh rực rỡ!',
  },
  {
    type: 'quick_sprint',
    title: 'Cú nước rút bất ngờ!',
    description:
      'Tiếng chim sơn ca hót vang làm các bạn thi nhau chạy nhanh về cổng trường!',
  },
];

function shufflePick<T>(items: T[], count: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

export default function App() {
  const [classroomsStore, setClassroomsStore] =
    useState<ClassroomsStore>(loadClassroomsStore);
  const [pickCount, setPickCount] = useState<number>(1);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('random');
  const [manualPickedIds, setManualPickedIds] = useState<string[]>([]);
  const [travelSeconds, setTravelSeconds] = useState<number>(15);
  const [secondsLeft, setSecondsLeft] = useState<number>(15);
  const [weather, setWeather] = useState<WeatherMode>('sunny');

  const [phase, setPhase] = useState<GamePhase>('idle');
  const [activeTargetIds, setActiveTargetIds] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [dialogueSpeakerId, setDialogueSpeakerId] = useState<string | null>(
    null,
  );
  const [dialogueText, setDialogueText] = useState<string | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isShowcaseOpen, setIsShowcaseOpen] = useState(false);
  const [showcaseInitialMode, setShowcaseInitialMode] = useState<
    'class' | 'catalog'
  >('catalog');
  const [showcaseStudent, setShowcaseStudent] = useState<Student | null>(null);
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [roundNotice, setRoundNotice] = useState<string | null>(null);
  const [activeSurprise, setActiveSurprise] = useState<SurpriseEvent | null>(
    null,
  );

  const countdownTimerRef = useRef<number | null>(null);
  const closingTimerRef = useRef<number | null>(null);
  const dialogueTimerRef = useRef<number | null>(null);
  const surpriseTimersRef = useRef<number[]>([]);
  const scriptIndexRef = useRef(0);
  const pendingTargetsRef = useRef<Student[]>([]);
  const activeClassIdRef = useRef<string>(classroomsStore.activeClassId);

  const activeClassroom = useMemo(
    () =>
      classroomsStore.classes.find(
        (c) => c.id === classroomsStore.activeClassId,
      ) ?? classroomsStore.classes[0],
    [classroomsStore],
  );

  const students = activeClassroom.students;
  const calledIds = useMemo(
    () => new Set(activeClassroom.calledIds),
    [activeClassroom.calledIds],
  );

  useEffect(() => {
    activeClassIdRef.current = activeClassroom.id;
  }, [activeClassroom.id]);

  // Persist classrooms store to localStorage automatically
  useEffect(() => {
    saveClassroomsStore(classroomsStore);
  }, [classroomsStore]);

  // Keep manual picks & pick count in sync with current class students
  useEffect(() => {
    const validIds = new Set(students.map((s) => s.id));
    setManualPickedIds((prev) => prev.filter((id) => validIds.has(id)));
    setPickCount((prev) =>
      Math.max(1, Math.min(prev, Math.max(1, students.length))),
    );
  }, [students]);

  const remainingStudents = useMemo(
    () => students.filter((s) => !calledIds.has(s.id)),
    [students, calledIds],
  );

  const updateClassCalledIds = useCallback(
    (classId: string, updater: (prev: string[]) => string[]) => {
      setClassroomsStore((prev) => ({
        ...prev,
        classes: prev.classes.map((cls) =>
          cls.id === classId
            ? {
                ...cls,
                calledIds: updater(cls.calledIds),
                updatedAt: Date.now(),
              }
            : cls,
        ),
      }));
    },
    [],
  );

  const clearActivityTimers = useCallback(() => {
    if (countdownTimerRef.current !== null) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (closingTimerRef.current !== null) {
      window.clearTimeout(closingTimerRef.current);
      closingTimerRef.current = null;
    }
    if (dialogueTimerRef.current !== null) {
      window.clearTimeout(dialogueTimerRef.current);
      dialogueTimerRef.current = null;
    }
    surpriseTimersRef.current.forEach((tid) => window.clearTimeout(tid));
    surpriseTimersRef.current = [];
    setActiveSurprise(null);
    setDialogueSpeakerId(null);
    setDialogueText(null);
  }, []);

  useEffect(() => {
    return () => {
      clearActivityTimers();
      audioEngine.stopAmbientLoop();
      audioEngine.stopBackgroundMusic();
    };
  }, [clearActivityTimers]);

  // Road speech bubbles (visual only, zero voice narration)
  useEffect(() => {
    if (phase !== 'walking' || students.length === 0) {
      if (dialogueTimerRef.current !== null) {
        window.clearTimeout(dialogueTimerRef.current);
        dialogueTimerRef.current = null;
      }
      setDialogueSpeakerId(null);
      setDialogueText(null);
      return;
    }

    let cancelled = false;
    let currentLines =
      ROAD_DIALOGUE_SCRIPTS[
        scriptIndexRef.current % ROAD_DIALOGUE_SCRIPTS.length
      ].lines;
    scriptIndexRef.current++;
    let lineIdx = 0;

    const runNextLine = () => {
      if (cancelled) return;
      if (lineIdx >= currentLines.length) {
        setDialogueSpeakerId(null);
        setDialogueText(null);
        dialogueTimerRef.current = window.setTimeout(() => {
          if (cancelled) return;
          currentLines =
            ROAD_DIALOGUE_SCRIPTS[
              scriptIndexRef.current % ROAD_DIALOGUE_SCRIPTS.length
            ].lines;
          scriptIndexRef.current++;
          lineIdx = 0;
          runNextLine();
        }, 1400);
        return;
      }

      const text = currentLines[lineIdx];
      lineIdx++;

      const speaker =
        students[Math.floor(Math.random() * students.length)] ?? students[0];
      setDialogueSpeakerId(speaker.id);
      setDialogueText(text);

      dialogueTimerRef.current = window.setTimeout(runNextLine, 2700);
    };

    dialogueTimerRef.current = window.setTimeout(runNextLine, 500);

    return () => {
      cancelled = true;
      if (dialogueTimerRef.current !== null) {
        window.clearTimeout(dialogueTimerRef.current);
        dialogueTimerRef.current = null;
      }
      setDialogueSpeakerId(null);
      setDialogueText(null);
    };
  }, [phase, students]);

  const handleStopToIdle = useCallback(() => {
    clearActivityTimers();
    audioEngine.stopAmbientLoop();
    audioEngine.stopBackgroundMusic();
    setSelectedStudents([]);
    setActiveTargetIds([]);
    setSecondsLeft(travelSeconds);
    setPhase('idle');
  }, [clearActivityTimers, travelSeconds]);

  const handleSelectClass = useCallback(
    (classId: string) => {
      if (classId === activeClassroom.id) return;
      handleStopToIdle();
      setManualPickedIds([]);
      setRoundNotice(null);
      setClassroomsStore((prev) => ({
        ...prev,
        activeClassId: classId,
      }));
    },
    [activeClassroom.id, handleStopToIdle],
  );

  const handleCreateClass = useCallback(
    (name: string) => {
      handleStopToIdle();
      setManualPickedIds([]);
      setRoundNotice(null);
      const created = createClassroomRecord(name, []);
      setClassroomsStore((prev) => ({
        activeClassId: created.id,
        classes: [...prev.classes, created],
      }));
    },
    [handleStopToIdle],
  );

  const handleRenameClass = useCallback((classId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setClassroomsStore((prev) => ({
      ...prev,
      classes: prev.classes.map((cls) =>
        cls.id === classId
          ? { ...cls, name: trimmed, updatedAt: Date.now() }
          : cls,
      ),
    }));
  }, []);

  const handleDeleteClass = useCallback(
    (classId: string) => {
      handleStopToIdle();
      setManualPickedIds([]);
      setRoundNotice(null);
      setClassroomsStore((prev) => {
        if (prev.classes.length <= 1) return prev;
        const remaining = prev.classes.filter((c) => c.id !== classId);
        const nextActiveId =
          prev.activeClassId === classId ? remaining[0].id : prev.activeClassId;
        return {
          activeClassId: nextActiveId,
          classes: remaining,
        };
      });
    },
    [handleStopToIdle],
  );

  const handleSaveClassStudents = useCallback(
    (classId: string, nextStudents: Student[]) => {
      const validIds = new Set(nextStudents.map((s) => s.id));
      let savedClassName = '';

      setClassroomsStore((prev) => ({
        ...prev,
        activeClassId: classId,
        classes: prev.classes.map((cls) => {
          if (cls.id !== classId) return cls;
          savedClassName = cls.name;
          return {
            ...cls,
            students: nextStudents,
            calledIds: cls.calledIds.filter((id) => validIds.has(id)),
            updatedAt: Date.now(),
          };
        }),
      }));

      handleStopToIdle();
      if (savedClassName) {
        setRoundNotice(
          `Đã lưu lớp “${savedClassName}” (${nextStudents.length} học sinh).`,
        );
      }
    },
    [handleStopToIdle],
  );

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioEngine.setMuted(nextMuted);
    if (!nextMuted && phase === 'walking') {
      audioEngine.startAmbientLoop();
      audioEngine.startBackgroundMusic();
    }
  };

  const triggerBellAndCloseGate = useCallback(() => {
    clearActivityTimers();
    setPhase('closing');
    setSecondsLeft(0);
    audioEngine.stopAmbientLoop();
    audioEngine.stopBackgroundMusic();
    audioEngine.playSchoolBell();

    const targetClassId = activeClassIdRef.current;

    closingTimerRef.current = window.setTimeout(() => {
      const winners = pendingTargetsRef.current;
      setSelectedStudents(winners);
      updateClassCalledIds(targetClassId, (prev) => {
        const set = new Set(prev);
        winners.forEach((w) => set.add(w.id));
        return Array.from(set);
      });
      setPhase('selected');
      audioEngine.playCelebrationApplause();
    }, 1500);
  }, [clearActivityTimers, updateClassCalledIds]);

  const startJourneyWithTargets = useCallback(
    (isReRoll = false) => {
      if (students.length === 0) {
        setIsRosterOpen(true);
        return;
      }

      clearActivityTimers();
      setRoundNotice(null);
      setSelectedStudents([]);

      let chosen: Student[] = [];

      if (selectionMode === 'manual' && !isReRoll) {
        const manualPool = students.filter((s) =>
          manualPickedIds.includes(s.id),
        );
        if (manualPool.length === 0) {
          setIsManualModalOpen(true);
          return;
        }
        chosen = manualPool.slice(0, pickCount);
      } else {
        let pool = students.filter((s) => !calledIds.has(s.id));
        if (pool.length === 0) {
          updateClassCalledIds(activeClassroom.id, () => []);
          pool = [...students];
          setRoundNotice(
            'Tất cả học sinh đã được gọi — Bắt đầu lượt mới cho cả lớp!',
          );
        } else if (pool.length < pickCount) {
          setRoundNotice(
            `Chỉ còn ${pool.length} học sinh chưa gọi trong lượt này!`,
          );
        }
        chosen = shufflePick(pool, Math.min(pickCount, pool.length));
      }

      pendingTargetsRef.current = chosen;
      setActiveTargetIds(chosen.map((c) => c.id));
      setSecondsLeft(travelSeconds);
      setPhase('walking');
      setIsDockCollapsed(true);

      if (!isMuted) {
        audioEngine.startAmbientLoop();
        audioEngine.startBackgroundMusic();
        audioEngine.playBirdChirp();
      }

      // Schedule 1-3 surprise situations dynamically during the walk
      const triggerRandomSurprise = (
        preferredPool?: typeof SURPRISE_TEMPLATES,
      ) => {
        const pool =
          preferredPool && preferredPool.length > 0
            ? preferredPool
            : SURPRISE_TEMPLATES;
        const tpl = pool[Math.floor(Math.random() * pool.length)];
        const onTimePool = students.filter(
          (s) => !chosen.some((c) => c.id === s.id),
        );
        const affected =
          tpl.type === 'quick_sprint' && onTimePool.length > 0
            ? onTimePool[Math.floor(Math.random() * onTimePool.length)]
            : chosen[Math.floor(Math.random() * chosen.length)] || students[0];

        setActiveSurprise({
          id: `sup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: tpl.type,
          title: tpl.title,
          description: tpl.description,
          affectedStudentId: affected?.id,
        });

        if (!isMuted) {
          audioEngine.playSurpriseChime();
          if (tpl.type === 'quick_sprint') {
            audioEngine.playBirdChirp();
          }
        }

        const clearTid = window.setTimeout(() => {
          setActiveSurprise((curr) => (curr?.type === tpl.type ? null : curr));
        }, 3800);
        surpriseTimersRef.current.push(clearTid);
      };

      const firstAtMs = Math.max(2200, Math.round(travelSeconds * 280));
      const firstTid = window.setTimeout(() => {
        triggerRandomSurprise();
      }, firstAtMs);
      surpriseTimersRef.current.push(firstTid);

      if (travelSeconds >= 15) {
        const secondAtMs = Math.round(travelSeconds * 600);
        const secondTid = window.setTimeout(() => {
          triggerRandomSurprise();
        }, secondAtMs);
        surpriseTimersRef.current.push(secondTid);
      }

      if (travelSeconds >= 45) {
        const thirdAtMs = Math.round(travelSeconds * 820);
        const thirdTid = window.setTimeout(() => {
          triggerRandomSurprise();
        }, thirdAtMs);
        surpriseTimersRef.current.push(thirdTid);
      }

      let remaining = travelSeconds;
      countdownTimerRef.current = window.setInterval(() => {
        remaining -= 1;
        setSecondsLeft(Math.max(0, remaining));
        if (remaining <= 0) {
          triggerBellAndCloseGate();
        }
      }, 1000);
    },
    [
      students,
      selectionMode,
      manualPickedIds,
      pickCount,
      calledIds,
      activeClassroom.id,
      travelSeconds,
      isMuted,
      clearActivityTimers,
      triggerBellAndCloseGate,
      updateClassCalledIds,
    ],
  );

  const handleResetRound = () => {
    updateClassCalledIds(activeClassroom.id, () => []);
    setRoundNotice(
      `Đã làm mới danh sách gọi cho lớp “${activeClassroom.name}”.`,
    );
  };

  const handleModeChange = (mode: SelectionMode) => {
    setSelectionMode(mode);
    if (
      mode === 'manual' &&
      manualPickedIds.length === 0 &&
      students.length > 0
    ) {
      setIsManualModalOpen(true);
    }
  };

  const openStudentShowcase = (stu: Student) => {
    setShowcaseStudent(stu);
    setShowcaseInitialMode('class');
    setIsShowcaseOpen(true);
  };

  const openCatalogShowcase = () => {
    setShowcaseInitialMode('catalog');
    setIsShowcaseOpen(true);
  };

  const lateHeadline = useMemo(() => {
    if (selectedStudents.length === 0) return '';
    if (selectedStudents.length === 1) {
      return `Bạn ${selectedStudents[0].name} đến trễ vì mải hái hoa, bắt bướm!`;
    }
    const allButLast = selectedStudents
      .slice(0, -1)
      .map((s) => `bạn ${s.name}`)
      .join(', ');
    const last = selectedStudents[selectedStudents.length - 1].name;
    const joined = allButLast.charAt(0).toUpperCase() + allButLast.slice(1);
    return `${joined} và bạn ${last} đến trễ vì mải hái hoa, bắt bướm!`;
  }, [selectedStudents]);

  const triggerManualSurprise = () => {
    if (phase !== 'walking' || students.length === 0) return;
    const candidates = SURPRISE_TEMPLATES.filter(
      (t) => t.type !== activeSurprise?.type,
    );
    const teacherGreetTpl = SURPRISE_TEMPLATES[0];
    const tpl =
      activeSurprise?.type !== 'teacher_greet' && Math.random() < 0.5
        ? teacherGreetTpl
        : candidates[Math.floor(Math.random() * candidates.length)] ||
          SURPRISE_TEMPLATES[0];

    const targetPool = students.filter((s) => activeTargetIds.includes(s.id));
    const onTimePool = students.filter((s) => !activeTargetIds.includes(s.id));
    const affected =
      tpl.type === 'quick_sprint' && onTimePool.length > 0
        ? onTimePool[Math.floor(Math.random() * onTimePool.length)]
        : targetPool[Math.floor(Math.random() * targetPool.length)] ||
          students[0];

    const greetCount = Math.min(
      students.length,
      tpl.type === 'teacher_greet'
        ? 2 + Math.floor(Math.random() * 2)
        : 1 + Math.floor(Math.random() * 2),
    );
    const shuffled = shufflePick(students, greetCount);
    const greetStudentIds = shuffled.map((s) => s.id);
    if (
      affected &&
      tpl.type !== 'giant_flower_find' &&
      tpl.type !== 'quick_sprint' &&
      !greetStudentIds.includes(affected.id)
    ) {
      greetStudentIds.unshift(affected.id);
    }

    const greetActions: Record<string, 'wave_greet' | 'bow_greet'> = {};
    greetStudentIds.forEach((id) => {
      greetActions[id] = Math.random() < 0.5 ? 'wave_greet' : 'bow_greet';
    });

    const eventId = `sup-man-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    setActiveSurprise({
      id: eventId,
      type: tpl.type,
      title: tpl.title,
      description: tpl.description,
      affectedStudentId: affected?.id,
      greetStudentIds,
      greetActions,
      isManual: true,
    });
    if (!isMuted) {
      audioEngine.playSurpriseChime();
    }
    const clearTid = window.setTimeout(() => {
      setActiveSurprise((curr) => (curr?.id === eventId ? null : curr));
    }, 3800);
    surpriseTimersRef.current.push(clearTid);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#ccebf8] select-none">
      {/* 2.5D Illustrated Ca Dong Village & Chibi Mascot Stage */}
      <VillageStage
        students={students}
        phase={phase}
        targetIds={activeTargetIds}
        travelSeconds={travelSeconds}
        dialogueSpeakerId={dialogueSpeakerId}
        dialogueText={dialogueText}
        activeSurprise={activeSurprise}
        weather={weather}
        onInspectStudent={openStudentShowcase}
      />

      {/* Top Navigation Bar */}
      <header className="fixed top-0 inset-x-0 z-30 px-3 sm:px-6 py-3 pointer-events-none">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-3 sm:gap-5 bg-white/95 border border-stone-200 shadow-md rounded-2xl px-4 sm:px-5 py-2.5 pointer-events-auto">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="font-display text-base sm:text-xl font-extrabold tracking-tight text-stone-900 whitespace-nowrap shrink-0">
              Đến Trường Thôi Nào!
            </h1>

            {/* Direct Class Selector */}
            <div className="flex items-center gap-2 min-w-0">
              <label htmlFor="active-class-select" className="sr-only">
                Chọn lớp học
              </label>
              <select
                id="active-class-select"
                value={activeClassroom.id}
                onChange={(e) => handleSelectClass(e.target.value)}
                disabled={phase === 'walking' || phase === 'closing'}
                className="h-9 max-w-[175px] sm:max-w-[210px] px-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-900 font-bold text-xs sm:text-sm truncate cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
              >
                {classroomsStore.classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.students.length} em)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-2.5 text-sm font-medium text-stone-600 truncate">
            <span className="font-bold text-red-700 whitespace-nowrap">
              Trường PTDTBT TH&amp;THCS Lý Tự Trọng
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums text-stone-800 font-semibold whitespace-nowrap">
              Còn {remainingStudents.length}/{students.length} bạn chưa gọi
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleMute}
              className="h-10 px-3 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 font-semibold text-sm flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-red-600" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-700" />
              )}
              <span className="hidden md:inline">
                {isMuted ? 'Tắt tiếng' : 'Nhạc & Chuông'}
              </span>
            </button>

            <button
              type="button"
              onClick={openCatalogShowcase}
              className="h-10 px-3.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 font-semibold text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">30 Chibi</span>
            </button>

            <button
              type="button"
              onClick={() => setIsRosterOpen(true)}
              className="h-10 px-3.5 sm:px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Lớp &amp; Danh sách</span>
            </button>
          </div>
        </div>
      </header>

      {/* Round Notice */}
      {roundNotice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 px-5 py-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-950 text-sm font-semibold shadow-md whitespace-nowrap">
          {roundNotice}
        </div>
      )}

      {/* Empty Class Callout (when teacher creates a fresh class before importing names) */}
      {phase === 'idle' && students.length === 0 && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-30 px-6 py-4 rounded-2xl bg-white/95 border-2 border-amber-400 shadow-xl text-center max-w-md space-y-2.5">
          <p className="font-display text-base sm:text-lg font-extrabold text-stone-900">
            Lớp “{activeClassroom.name}” chưa có học sinh
          </p>
          <p className="text-xs sm:text-sm text-stone-600">
            Nhấn nút bên dưới để dán danh sách cả lớp, tự nhận diện Nam/Nữ và hiện các bạn nhỏ Ca Dong lên đường đến trường.
          </p>
          <button
            type="button"
            onClick={() => setIsRosterOpen(true)}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm cursor-pointer whitespace-nowrap"
          >
            Nhập nhanh danh sách lớp
          </button>
        </div>
      )}

      {/* Live Countdown Timer Banner during Walk */}
      {phase === 'walking' && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none">
          <div className="px-6 py-2.5 rounded-2xl bg-white/95 border-2 border-emerald-500 text-stone-900 shadow-lg flex items-center gap-3 whitespace-nowrap">
            <Clock className="w-5 h-5 text-emerald-700 shrink-0" />
            <span className="text-sm sm:text-base font-bold">
              Cổng trường đang mở · Thời gian còn lại:
            </span>
            <span
              className={`font-display text-xl sm:text-2xl font-extrabold tabular-nums ${
                secondsLeft <= 4 ? 'text-red-600' : 'text-emerald-700'
              }`}
            >
              {secondsLeft} giây
            </span>
          </div>

          {activeSurprise && (
            <div className="px-5 py-2 rounded-2xl bg-amber-50/95 border-2 border-amber-400 text-stone-900 shadow-lg flex items-center gap-2.5 max-w-[90vw]">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="text-xs sm:text-sm leading-snug">
                <span className="font-extrabold text-amber-900">
                  {activeSurprise.title}
                </span>{' '}
                <span className="text-stone-700 font-medium">
                  {activeSurprise.description}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bell Ringing & Closing Gate Banner */}
      {phase === 'closing' && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 px-7 py-3.5 rounded-2xl bg-red-600 border-2 border-amber-300 text-white shadow-xl flex items-center gap-3 whitespace-nowrap">
          <BellRing className="w-6 h-6 text-amber-300 shrink-0" />
          <p className="font-display text-lg sm:text-2xl font-extrabold tracking-tight">
            Reng... reng... reng! Chuông reo, cổng trường đóng lại!
          </p>
        </div>
      )}

      {/* Late Student(s) Announcement Card */}
      {phase === 'selected' && selectedStudents.length > 0 && (
        <div className="fixed top-18 inset-x-4 z-30 flex justify-center pointer-events-none">
          <div className="w-full max-w-3xl bg-white/95 border-2 border-amber-400 rounded-2xl shadow-2xl px-5 py-3 text-center pointer-events-auto">
            <p className="text-sm sm:text-base font-bold text-red-700">
              {lateHeadline}
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
              {selectedStudents.map((stu) => (
                <button
                  key={stu.id}
                  type="button"
                  onClick={() => openStudentShowcase(stu)}
                  title="Nhấn để xem toàn thân Chibi, 6 tư thế & 7 biểu cảm"
                  className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-amber-100 hover:bg-amber-200/80 border border-amber-300 shadow-sm transition-colors cursor-pointer"
                >
                  {stu.avatarUrl ? (
                    <img
                      src={stu.avatarUrl}
                      alt={stu.name}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-white shadow"
                    />
                  ) : (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white border-2 border-amber-300 shadow overflow-hidden flex items-center justify-center shrink-0">
                      <div className="w-16 h-20 translate-y-2.5 pointer-events-none">
                        <ChibiCharacterSVG student={stu} expression="sad" />
                      </div>
                    </div>
                  )}
                  <span className="font-display text-2xl sm:text-3xl font-extrabold text-stone-950 tracking-tight">
                    {stu.name}
                  </span>
                </button>
              ))}
            </div>

            <p className="mt-3 text-sm sm:text-base font-bold text-emerald-800 leading-snug max-w-2xl mx-auto">
              “{CLOSING_PROMPT_TEXT}”
            </p>
          </div>
        </div>
      )}

      {/* Collapsible Bottom Control Dock */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center max-w-[96vw]">
        <div className="flex items-center gap-1.5 mb-1.5">
          {isDockCollapsed && phase === 'walking' && (
            <>
              <button
                type="button"
                onClick={triggerManualSurprise}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-display font-bold text-xs flex items-center gap-1.5 shadow-md whitespace-nowrap cursor-pointer transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tình huống bất ngờ</span>
              </button>
              <button
                type="button"
                onClick={triggerBellAndCloseGate}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-display font-bold text-xs flex items-center gap-1.5 shadow-md whitespace-nowrap cursor-pointer transition-colors"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>Đóng cổng</span>
              </button>
            </>
          )}

          {isDockCollapsed && phase === 'selected' && (
            <>
              <button
                type="button"
                onClick={() => startJourneyWithTargets(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-display font-bold text-xs flex items-center gap-1.5 shadow-md whitespace-nowrap cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Chọn lại</span>
              </button>
              <button
                type="button"
                onClick={() => startJourneyWithTargets(false)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-display font-bold text-xs flex items-center gap-1.5 shadow-md whitespace-nowrap cursor-pointer transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Tiếp tục</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsDockCollapsed((v) => !v)}
            className={`px-3.5 py-1.5 bg-white/95 border border-stone-200 text-xs font-semibold text-stone-700 hover:text-stone-950 flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap ${
              isDockCollapsed ? 'rounded-xl' : 'rounded-t-xl border-b-0 -mb-1.5'
            }`}
          >
            {isDockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Mở bảng điều khiển</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Thu gọn</span>
              </>
            )}
          </button>
        </div>

        {!isDockCollapsed && (
          <div className="bg-white/95 border border-stone-200 shadow-xl rounded-2xl px-3 sm:px-5 py-3 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            {/* 1. Flexible Late Student Count Stepper (1 .. class size) */}
            <div
              className="flex items-center gap-1.5 px-2 py-1 bg-stone-100 rounded-xl border border-stone-200"
              role="group"
              aria-label="Số lượng học sinh đi trễ"
            >
              <span className="text-xs font-semibold text-stone-600 pl-1 whitespace-nowrap">
                HS đi trễ:
              </span>
              <button
                type="button"
                disabled={
                  phase === 'walking' || phase === 'closing' || pickCount <= 1
                }
                onClick={() => {
                  const next = Math.max(1, pickCount - 1);
                  setPickCount(next);
                  setManualPickedIds((prev) => prev.slice(0, next));
                }}
                className="w-7 h-7 rounded-lg bg-white border border-stone-200 hover:bg-amber-100 text-stone-800 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
                aria-label="Giảm số học sinh đi trễ"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="min-w-[44px] text-center font-display font-extrabold text-sm text-stone-950 tabular-nums whitespace-nowrap">
                {pickCount} em
              </span>
              <button
                type="button"
                disabled={
                  phase === 'walking' ||
                  phase === 'closing' ||
                  pickCount >= Math.max(1, students.length)
                }
                onClick={() =>
                  setPickCount((prev) =>
                    Math.min(Math.max(1, students.length), prev + 1),
                  )
                }
                className="w-7 h-7 rounded-lg bg-white border border-stone-200 hover:bg-amber-100 text-stone-800 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
                aria-label="Tăng số học sinh đi trễ"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 2. Selection Mode: Random vs Manual */}
            <div
              className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl border border-stone-200"
              role="group"
              aria-label="Cách chọn học sinh"
            >
              <button
                type="button"
                disabled={phase === 'walking' || phase === 'closing'}
                onClick={() => handleModeChange('random')}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-50 ${
                  selectionMode === 'random'
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Ngẫu nhiên</span>
              </button>

              <button
                type="button"
                disabled={phase === 'walking' || phase === 'closing'}
                onClick={() => handleModeChange('manual')}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-50 ${
                  selectionMode === 'manual'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Tự chọn</span>
              </button>

              {selectionMode === 'manual' && (
                <button
                  type="button"
                  disabled={phase === 'walking' || phase === 'closing'}
                  onClick={() => setIsManualModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                >
                  Chọn em ({Math.min(manualPickedIds.length, pickCount)}/
                  {pickCount})
                </button>
              )}
            </div>

            {/* 3. Travel Time Selector */}
            <div
              className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl border border-stone-200"
              role="group"
              aria-label="Thời gian đến trường"
            >
              <span className="px-2 text-xs font-semibold text-stone-500 hidden sm:inline whitespace-nowrap">
                Thời gian:
              </span>
              {TIME_OPTIONS.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  disabled={phase === 'walking' || phase === 'closing'}
                  onClick={() => {
                    setTravelSeconds(sec);
                    setSecondsLeft(sec);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold tabular-nums whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-50 ${
                    travelSeconds === sec
                      ? 'bg-stone-900 text-white shadow-sm'
                      : 'text-stone-700 hover:text-stone-950'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>

            {/* 4. Weather Selector (Nắng / Mưa nhẹ / Sương mù) */}
            <div
              className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl border border-stone-200"
              role="group"
              aria-label="Thời tiết trên đường đến trường"
            >
              <span className="px-2 text-xs font-semibold text-stone-500 hidden sm:inline whitespace-nowrap">
                Thời tiết:
              </span>
              {WEATHER_OPTIONS.map((opt) => {
                const active = weather === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setWeather(opt.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      active
                        ? opt.id === 'sunny'
                          ? 'bg-amber-400 text-stone-950 shadow-sm'
                          : opt.id === 'light_rain'
                            ? 'bg-sky-600 text-white shadow-sm'
                            : 'bg-slate-600 text-white shadow-sm'
                        : 'text-stone-700 hover:text-stone-950'
                    }`}
                  >
                    {opt.id === 'sunny' && <Sun className="w-3.5 h-3.5" />}
                    {opt.id === 'light_rain' && <CloudRain className="w-3.5 h-3.5" />}
                    {opt.id === 'foggy' && <CloudFog className="w-3.5 h-3.5" />}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* 5. Primary Action Buttons */}
            {phase === 'idle' && (
              <button
                type="button"
                onClick={() => startJourneyWithTargets(false)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-display font-bold text-sm sm:text-base flex items-center gap-2 whitespace-nowrap shrink-0 shadow-md transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>BẮT ĐẦU HÀNH TRÌNH</span>
              </button>
            )}

            {phase === 'walking' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={triggerManualSurprise}
                  className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-display font-bold text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-md transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Tình huống bất ngờ</span>
                </button>
                <button
                  type="button"
                  onClick={triggerBellAndCloseGate}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-display font-bold text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-md transition-colors cursor-pointer"
                >
                  <BellRing className="w-4 h-4" />
                  <span>REO CHUÔNG ĐÓNG CỔNG</span>
                </button>
                <button
                  type="button"
                  onClick={handleStopToIdle}
                  className="px-3.5 py-2.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>DỪNG</span>
                </button>
              </div>
            )}

            {phase === 'closing' && (
              <button
                type="button"
                disabled
                className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-display font-bold text-sm whitespace-nowrap shrink-0 opacity-90"
              >
                CHUÔNG ĐANG REO...
              </button>
            )}

            {phase === 'selected' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => startJourneyWithTargets(true)}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-display font-bold text-sm flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-md transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>CHỌN LẠI</span>
                </button>
                <button
                  type="button"
                  onClick={() => startJourneyWithTargets(false)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-display font-bold text-sm flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-md transition-colors cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>TIẾP TỤC</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Multi-Class Roster & Quick Bulk Import Modal */}
      <StudentListModal
        isOpen={isRosterOpen}
        onClose={() => setIsRosterOpen(false)}
        classrooms={classroomsStore.classes}
        activeClassId={activeClassroom.id}
        onSelectClass={handleSelectClass}
        onCreateClass={handleCreateClass}
        onRenameClass={handleRenameClass}
        onDeleteClass={handleDeleteClass}
        onSaveClassStudents={handleSaveClassStudents}
        onResetRound={handleResetRound}
      />

      {/* Manual Student Selection Modal */}
      <ManualSelectModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        students={students}
        selectedIds={manualPickedIds}
        maxCount={pickCount}
        onChangeSelectedIds={setManualPickedIds}
      />

      {/* 30 Ca Dong Chibi Character Gallery & Interactive Pose/Expression Showcase */}
      <ChibiShowcaseModal
        isOpen={isShowcaseOpen}
        initialMode={showcaseInitialMode}
        student={showcaseStudent}
        students={students}
        onSelectStudent={setShowcaseStudent}
        onClose={() => setIsShowcaseOpen(false)}
      />
    </div>
  );
}
