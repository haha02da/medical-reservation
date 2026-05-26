'use client';

import { TimeSlot } from '@/lib/types';

const DEPT_COLORS: Record<string, string> = {
  '내과': 'bg-blue-100 text-blue-700',
  '정형외과': 'bg-green-100 text-green-700',
  '피부과': 'bg-pink-100 text-pink-700',
  '이비인후과': 'bg-purple-100 text-purple-700',
  '신경과': 'bg-orange-100 text-orange-700',
  '소아과': 'bg-teal-100 text-teal-700',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

interface SlotGridProps {
  slots: TimeSlot[];
  onSelect: (slot: TimeSlot) => void;
  disabled?: boolean;
}

export default function SlotGrid({ slots, onSelect, disabled }: SlotGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
      {slots.map(slot => (
        <button
          key={slot.id}
          onClick={() => !disabled && onSelect(slot)}
          disabled={disabled}
          className={`
            flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all
            ${disabled
              ? 'border-gray-200 bg-gray-50 opacity-60 cursor-default'
              : 'border-gray-200 bg-white hover:border-blue-400 hover:shadow-md cursor-pointer active:scale-95'
            }
          `}
        >
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DEPT_COLORS[slot.department] ?? 'bg-gray-100 text-gray-600'}`}>
            {slot.department}
          </span>
          <span className="text-sm font-semibold text-gray-800">{slot.doctorName} 의사</span>
          <span className="text-xs text-gray-500">{formatDate(slot.date)}</span>
          <span className="text-base font-bold text-blue-600">{slot.time}</span>
          {!disabled && (
            <span className="mt-1 w-full text-center text-xs font-medium bg-blue-600 text-white rounded-lg py-1">
              선택
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
