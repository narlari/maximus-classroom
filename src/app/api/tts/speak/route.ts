import OpenAI from 'openai'
import { NextRequest } from 'next/server'

const openai = new OpenAI()

export async function POST(req: NextRequest) {
  const { text } = await req.json()
  const speech = await openai.audio.speech.create({
    model: 'tts-1',
    voice: 'nova',
    input: text,
  })
  const buffer = Buffer.from(await speech.arrayBuffer())
  return new Response(buffer, {
    headers: { 'Content-Type': 'audio/mpeg' },
  })
}
