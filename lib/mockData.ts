import { Doctor, TimeSlot } from './types';

export const DOCTORS: Doctor[] = [
  { id: 'doc-1', name: '김민준', department: '내과' },
  { id: 'doc-2', name: '이서연', department: '정형외과' },
  { id: 'doc-3', name: '박지훈', department: '피부과' },
  { id: 'doc-4', name: '최예린', department: '이비인후과' },
  { id: 'doc-5', name: '정도현', department: '신경과' },
  { id: 'doc-6', name: '한수아', department: '소아과' },
];

const MORNING_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
const AFTERNOON_SLOTS = ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];
const TIME_SLOTS = [...MORNING_SLOTS, ...AFTERNOON_SLOTS];

function getWorkingDays(from: Date, count: number): string[] {
  const days: string[] = [];
  const current = new Date(from);
  while (days.length < count) {
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) {
      days.push(current.toISOString().split('T')[0]);
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

// Deterministic availability based on slot ID hash
function isAvailable(id: string): boolean {
  let hash = 0;
  for (const ch of id) {
    hash = (hash * 31 + ch.charCodeAt(0)) % 100;
  }
  return hash > 28; // ~72% available
}

let _slots: TimeSlot[] | null = null;

export function getSlots(): TimeSlot[] {
  if (_slots) return _slots;

  const workingDays = getWorkingDays(new Date(), 8);
  const slots: TimeSlot[] = [];

  for (const date of workingDays) {
    for (const doctor of DOCTORS) {
      for (const time of TIME_SLOTS) {
        const id = `${doctor.id}-${date}-${time.replace(':', '')}`;
        slots.push({
          id,
          doctorId: doctor.id,
          doctorName: doctor.name,
          department: doctor.department,
          date,
          time,
          available: isAvailable(id),
        });
      }
    }
  }

  _slots = slots;
  return slots;
}

export function getSlotsForContext(): TimeSlot[] {
  const all = getSlots();
  const departments = ['내과', '정형외과', '피부과', '이비인후과', '신경과', '소아과'] as const;
  const result: TimeSlot[] = [];
  for (const dept of departments) {
    const deptSlots = all.filter(s => s.available && s.department === dept).slice(0, 10);
    result.push(...deptSlots);
  }
  return result;
}
