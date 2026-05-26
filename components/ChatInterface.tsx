'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { UIMessage, TimeSlot, Booking, ChatAPIResponse, ConversationStep } from '@/lib/types';
import { getSlots, getSlotsForContext } from '@/lib/mockData';
import SlotGrid from './SlotGrid';
import BookingForm from './BookingForm';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

function generateBookingId(): string {
  return 'MED-' + Math.random().toString(36).slice(2, 9).toUpperCase();
}

const WELCOME: UIMessage = {
  id: 'welcome',
  role: 'assistant',
  content: '안녕하세요! 저는 진료 예약 도우미 메디봇입니다.\n\n어떤 증상이 있으신가요? 또는 어떤 진료가 필요하신지 말씀해 주시면 적합한 의사 선생님과 예약 가능 시간을 안내해 드리겠습니다.',
};

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 150, 300].map((delay, i) => (
        <span
          key={i}
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

function StepBadge({ step }: { step: ConversationStep }) {
  const steps = [
    { key: 'analyzing', label: '1. 문의 분석' },
    { key: 'slots_shown', label: '2. 일정 확인' },
    { key: 'collecting_info', label: '3. 예약 확정' },
    { key: 'confirmed', label: '완료' },
  ];
  const current = steps.findIndex(s => s.key === step);
  if (current < 0) return null;
  return (
    <div className="flex items-center gap-1 text-xs text-blue-200">
      {steps.map((s, i) => (
        <span key={s.key} className="flex items-center gap-1">
          <span className={`
            px-2 py-0.5 rounded-full font-medium
            ${i === current ? 'bg-white text-blue-700' : i < current ? 'bg-blue-500 text-blue-100' : 'bg-blue-700 text-blue-300'}
          `}>
            {s.label}
          </span>
          {i < steps.length - 1 && <span className="text-blue-400">›</span>}
        </span>
      ))}
    </div>
  );
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<UIMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<ConversationStep>('initial');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [allSlots] = useState<TimeSlot[]>(() => getSlots());

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    setIsLoading(true);
    setStep('analyzing');

    const userMsg: UIMessage = { id: `u-${Date.now()}`, role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);

    try {
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: text,
          conversationHistory: history,
          availableSlots: getSlotsForContext(),
        }),
      });

      const data: ChatAPIResponse = await res.json();

      let slots: TimeSlot[] = [];
      if (data.action === 'show_slots' && data.suggestedSlotIds?.length) {
        const ids = new Set(data.suggestedSlotIds);
        slots = allSlots.filter(s => ids.has(s.id));
        setStep('slots_shown');
      } else {
        setStep('initial');
      }

      const assistantMsg: UIMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        slots: slots.length > 0 ? slots : undefined,
        action: data.action === 'show_slots' ? 'show_slots' : 'none',
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: '죄송합니다. 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        },
      ]);
      setStep('initial');
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, allSlots]);

  const handleSelectSlot = useCallback((slot: TimeSlot) => {
    if (step !== 'slots_shown') return;
    setSelectedSlot(slot);
    setStep('collecting_info');
    setMessages(prev => [
      ...prev,
      {
        id: `u-sel-${Date.now()}`,
        role: 'user',
        content: `${formatDate(slot.date)} ${slot.time} ${slot.doctorName} 의사님 (${slot.department}) 예약을 선택했습니다.`,
      },
      {
        id: `a-form-${Date.now()}`,
        role: 'assistant',
        content: `${slot.department} ${slot.doctorName} 의사님 진료를 선택하셨습니다.\n예약 완료를 위해 아래 정보를 입력해 주세요.`,
        action: 'ask_info',
      },
    ]);
  }, [step]);

  const handleConfirmBooking = useCallback((patientName: string, phone: string) => {
    if (!selectedSlot) return;
    const booking: Booking = {
      id: generateBookingId(),
      patientName,
      phone,
      slot: selectedSlot,
      bookedAt: new Date().toISOString(),
    };
    setStep('confirmed');
    setMessages(prev => [
      ...prev,
      {
        id: `a-done-${Date.now()}`,
        role: 'assistant',
        content: `예약이 완료되었습니다!\n\n예약번호: ${booking.id}\n환자명: ${patientName}${phone ? `\n연락처: ${phone}` : ''}\n진료과: ${selectedSlot.department}\n담당의사: ${selectedSlot.doctorName} 의사님\n일시: ${formatDate(selectedSlot.date)} ${selectedSlot.time}\n\n예약 당일 10분 전까지 내원해 주시기 바랍니다.`,
      },
    ]);
  }, [selectedSlot]);

  const handleCancelBooking = useCallback(() => {
    setSelectedSlot(null);
    setStep('slots_shown');
    setMessages(prev => prev.filter(m => m.action !== 'ask_info' && !m.content.includes('예약을 선택했습니다')));
  }, []);

  const handleReset = useCallback(() => {
    setMessages([WELCOME]);
    setStep('initial');
    setSelectedSlot(null);
    setInput('');
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white max-w-3xl mx-auto shadow-2xl">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl flex-shrink-0">
            🏥
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">메디봇 예약 시스템</h1>
            <p className="text-blue-200 text-xs">AI 기반 스마트 진료 예약</p>
          </div>
        </div>
        {step !== 'initial' && (
          <div className="mt-3">
            <StepBadge step={step} />
          </div>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50">
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-2`}>
            <div className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                  🤖
                </div>
              )}
              <div
                className={`
                  max-w-xs sm:max-w-sm rounded-2xl px-4 py-3 text-sm whitespace-pre-line
                  ${msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-white text-gray-800 rounded-tl-none shadow-sm border border-gray-100'
                  }
                `}
              >
                {msg.content}
              </div>
            </div>

            {/* Slot grid */}
            {msg.slots && msg.slots.length > 0 && (
              <div className="pl-10 w-full">
                <SlotGrid
                  slots={msg.slots}
                  onSelect={handleSelectSlot}
                  disabled={step !== 'slots_shown'}
                />
              </div>
            )}

            {/* Booking form */}
            {msg.action === 'ask_info' && step === 'collecting_info' && selectedSlot && (
              <div className="pl-10">
                <BookingForm
                  slot={selectedSlot}
                  onConfirm={handleConfirmBooking}
                  onCancel={handleCancelBooking}
                />
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm flex-shrink-0">
              🤖
            </div>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-none px-4 py-3">
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-t border-gray-200 bg-white">
        {step === 'confirmed' ? (
          <div className="text-center">
            <button
              onClick={handleReset}
              className="bg-blue-600 text-white rounded-xl px-8 py-3 text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              새 예약하기
            </button>
          </div>
        ) : step === 'collecting_info' ? (
          <p className="text-center text-sm text-gray-400 py-1">위 양식을 작성해 예약을 완료해 주세요.</p>
        ) : (
          <>
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="증상이나 진료 이유를 입력해 주세요..."
                rows={1}
                disabled={isLoading}
                className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 max-h-32 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="flex-shrink-0 bg-blue-600 text-white rounded-xl px-4 py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                전송
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">Enter로 전송 · Shift+Enter로 줄바꿈</p>
          </>
        )}
      </div>
    </div>
  );
}
