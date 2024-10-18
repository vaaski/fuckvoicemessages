import OpenAI from "openai"
import type { FVMContext } from "./bot.ts"

export const createTranscript = async (ctx: FVMContext, file: Response) => {
	const apiKey = ctx.session.openaiApiKey
	if (!apiKey) throw new Error("No OpenAI API key found.")

	const openai = new OpenAI({ apiKey })

	const transcription = await openai.audio.transcriptions.create({
		model: "whisper-1",
		file,
	})

	return transcription.text
}

export const createSummary = async (ctx: FVMContext, transcription: string) => {
	const apiKey = ctx.session.openaiApiKey
	if (!apiKey) throw new Error("No OpenAI API key found.")

	const openai = new OpenAI({ apiKey })

	const summary = await openai.chat.completions.create({
		model: "gpt-4o",
		temperature: 0.2,
		max_tokens: 1024,
		messages: [
			{
				role: "system",
				content: [
					"You summarize a transcription of a voice message into brief bullet points.",
					"Keep the original language, tone and point of view.",
				].join("\n"),
			},
			{
				role: "user",
				content: transcription,
			},
		],
	})

	const summaryText = summary.choices[0].message.content
	if (!summaryText) throw new Error("OpenAI returned no summary text.")

	return summaryText
}
