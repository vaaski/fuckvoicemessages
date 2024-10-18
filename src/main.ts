import { Bot, Context, session, type SessionFlavor } from "grammy"
import { FileAdapter } from "@grammyjs/storage-file"
import { FileFlavor, hydrateFiles } from "@grammyjs/files"
import OpenAI from "openai"

import { TELEGRAM_BOT_TOKEN } from "./environment.ts"
import { openaiApiKeyRegex } from "./constant.ts"
import { chunkArray, handleError } from "./util.ts"

const sessionData = {
	openaiApiKey: "",
}
export type FVMContext = FileFlavor<Context> & SessionFlavor<typeof sessionData>

const bot = new Bot<FVMContext>(TELEGRAM_BOT_TOKEN)
bot.api.config.use(hydrateFiles(bot.token))
bot.use(session({
	initial: () => ({ openaiApiKey: "" }),
	storage: new FileAdapter({ dirName: "sessions" }),
}))

bot.on("message:text", async (ctx, next) => {
	const match = ctx.msg.text.match(openaiApiKeyRegex)
	if (!match) return next()

	const [, apiKey] = match
	ctx.session.openaiApiKey = apiKey

	await bot.api.deleteMessage(ctx.chat.id, ctx.msg.message_id)
	await ctx.reply("Stored OpenAI API key.")
})

bot.on([":voice", ":audio"], async (ctx) => {
	try {
		const audio = ctx.msg.voice ?? ctx.msg.audio
		if (!audio) return ctx.reply("No audio found.")

		const duration = audio.duration
		const waitingMessage = ctx.reply(
			`Transcribing your ${duration}s voice message...`,
		)

		const file = await ctx.getFile()
		const response = await fetch(file.getUrl())
		if (!response.body) throw new Error("No response body")

		const apiKey = ctx.session.openaiApiKey
		if (!apiKey) throw new Error("No OpenAI API key found.")

		const openai = new OpenAI({ apiKey })

		const transcription = await openai.audio.transcriptions.create({
			file: response,
			model: "whisper-1",
		})

		const awaitedWaitingMessage = await waitingMessage
		bot.api.deleteMessage(ctx.chat.id, awaitedWaitingMessage.message_id)
		if (transcription.text.length > 4000) {
			const chunks = chunkArray([...transcription.text], 4000).map((chunk) =>
				chunk.join("")
			)

			for (const chunk of chunks) {
				await ctx.reply(chunk, { reply_to_message_id: ctx.msg.message_id })
			}
		} else {
			await ctx.reply(transcription.text, {
				reply_to_message_id: ctx.msg.message_id,
			})
		}

		if (transcription.text.length > 500) {
			const summarizingWaitingMessage = await ctx.reply("Summarizing...")
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
						content: transcription.text,
					},
				],
			})

			const response = summary.choices[0].message.content
			if (!response) throw new Error("No response")

			await ctx.reply(response, { reply_to_message_id: ctx.msg.message_id })
			bot.api.deleteMessage(ctx.chat.id, summarizingWaitingMessage.message_id)
		}
	} catch (error) {
		handleError(ctx, error)
	}
})

bot.on("message", async (ctx) => {
	await ctx.reply("Hello World!")
})

console.log("starting bot")
bot.start()
