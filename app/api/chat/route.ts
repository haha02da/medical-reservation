import { NextRequest, NextResponse } from 'next/server';
import { ChatAPIRequest, ChatAPIResponse } from '@/lib/types';

const SYSTEM_PROMPT = `당신은 병원 예약 도우미 '메디봇'입니다. 환자의 문의를 분석하여 적절한 진료과를 추천하고 예약 시간을 제안합니다.

[진료과 선택 기준]
- 내과: 발열, 감기, 복통, 소화불량, 고혈압, 당뇨, 만성질환
- 정형외과: 허리통증, 관절통, 근육통, 골절, 어깨·무릎 통증
- 피부과: 피부발진, 여드름, 아토피, 두드러기, 탈모
- 이비인후과: 귀통증, 코막힘, 인후통, 편도염, 청력저하
- 신경과: 두통, 어지러움, 손발저림, 수면장애, 기억력 저하
- 소아과: 소아 발열, 소아 기침, 예방접종, 성장 상담

[응답 규칙]
- 반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이)
- 증상이 명확하면 action을 "show_slots"로, suggestedSlotIds에 적합한 슬롯 ID를 3개 선택하세요
- 슬롯은 반드시 제공된 예약 가능 목록에서만 선택하세요
- 증상이 불명확하면 action을 "none"으로, 추가 질문을 message에 담으세요

[응답 JSON 형식]
{
  "message": "환자에게 전달할 친절한 한국어 메시지 (2-3문장)",
  "action": "show_slots" 또는 "none",
  "department": "추천 진료과 (없으면 null)",
  "suggestedSlotIds": ["슬롯ID1", "슬롯ID2", "슬롯ID3"]
}`;

function extractJSON(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatAPIRequest = await req.json();
    const { userMessage, conversationHistory, availableSlots } = body;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: 'API 키가 설정되지 않았습니다. .env.local 파일에 OPENROUTER_API_KEY를 설정해 주세요.', action: 'none' },
        { status: 200 }
      );
    }

    const slotsContext = availableSlots
      .map(s => `[${s.id}] ${s.department} - ${s.doctorName} 의사 | ${s.date} ${s.time}`)
      .join('\n');

    const augmentedUserMessage = `[예약 가능 슬롯]\n${slotsContext}\n\n[환자 문의]\n${userMessage}`;

    const messages = [
      ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: augmentedUserMessage },
    ];

    const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Medical Reservation System',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenRouter error:', err);
      return NextResponse.json(
        { message: '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', action: 'none' },
        { status: 200 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    let parsed: ChatAPIResponse;
    try {
      parsed = JSON.parse(extractJSON(content));
    } catch {
      parsed = { message: content, action: 'none' };
    }

    // Validate suggestedSlotIds against available slots
    if (parsed.suggestedSlotIds && parsed.suggestedSlotIds.length > 0) {
      const validIds = new Set(availableSlots.map(s => s.id));
      parsed.suggestedSlotIds = parsed.suggestedSlotIds.filter(id => validIds.has(id));
      if (parsed.suggestedSlotIds.length === 0) {
        parsed.action = 'none';
      }
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Chat route error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', action: 'none' },
      { status: 200 }
    );
  }
}
