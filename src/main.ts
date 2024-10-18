import { createBot } from "./bot.ts"
import { commandHandler } from "./commands.ts"
import { openaiApiKeyRegex } from "./constant.ts"
import { createSummary, createTranscript } from "./openai.ts"
import { chunkText, handleError } from "./util.ts"

const bot = createBot()
commandHandler(bot)

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
		const waitingMessage = await ctx.reply(
			`Transcribing your ${duration}s voice message...`,
		)

		const file = await ctx.getFile()
		const response = await fetch(file.getUrl())
		if (!response.body) throw new Error("No response body from Telegram.")

		const transcription = await createTranscript(ctx, response)

		bot.api.deleteMessage(ctx.chat.id, waitingMessage.message_id)

		if (transcription.length > 4000) {
			const chunks = chunkText(transcription, 4000)

			for (const chunk of chunks) {
				await ctx.reply(chunk, { reply_to_message_id: ctx.msg.message_id })
			}
		} else {
			await ctx.reply(transcription, {
				reply_to_message_id: ctx.msg.message_id,
			})
		}

		if (transcription.length > 500) {
			const summaryWaitingMessage = await ctx.reply("Summarizing...")
			const summary = await createSummary(ctx, transcription)

			await ctx.reply(summary, { reply_to_message_id: ctx.msg.message_id })
			bot.api.deleteMessage(ctx.chat.id, summaryWaitingMessage.message_id)
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
