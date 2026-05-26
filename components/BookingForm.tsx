'use client';

import { useState } from 'react';
import { TimeSlot } from '@/lib/types';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

interface BookingFormProps {
  slot: TimeSlot;
  onConfirm: (patientName: string, phone: string) => void;
  onCancel: () => void;
}

export default function BookingForm({ slot, onConfirm, onCancel }: BookingFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nameError, setNameError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('이름을 입력해 주세요.');
      return;
    }
    onConfirm(name.trim(), phone.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4 w-full max-w-sm shadow-sm">
      {/* Selected slot summary */}
      <div className="bg-blue-50 rounded-xl p-3 text-sm space-y-1">
        <p className="font-semibold text-blue-700">{slot.department} · {slot.doctorName} 의사</p>
        <p className="text-gray-600">{formatDate(slot.date)} {slot.time}</p>
      </div>

      {/* Patient name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          환자 이름 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setNameError(''); }}
          placeholder="홍길동"
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            nameError ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">연락처 (선택)</label>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="010-0000-0000"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-gray-300 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          취소
        </button>
        <button
          type="submit"
          className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          예약 확정
        </button>
      </div>
    </form>
  );
}
