export type Department =
  | '내과'
  | '정형외과'
  | '피부과'
  | '이비인후과'
  | '신경과'
  | '소아과';

export interface Doctor {
  id: string;
  name: string;
  department: Department;
}

export interface TimeSlot {
  id: string;
  doctorId: string;
  doctorName: string;
  department: Department;
  date: string;   // YYYY-MM-DD
  time: string;   // HH:MM
  available: boolean;
}

export type ConversationStep =
  | 'initial'
  | 'analyzing'
  | 'slots_shown'
  | 'collecting_info'
  | 'confirmed';

export type MessageAction = 'show_slots' | 'ask_info' | 'none';

export interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  slots?: TimeSlot[];
  action?: MessageAction;
}

export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatAPIRequest {
  userMessage: string;
  conversationHistory: LLMMessage[];
  availableSlots: TimeSlot[];
}

export interface ChatAPIResponse {
  message: string;
  action?: 'show_slots' | 'none';
  suggestedSlotIds?: string[];
  department?: Department;
}

export interface Booking {
  id: string;
  patientName: string;
  phone: string;
  slot: TimeSlot;
  bookedAt: string;
}
