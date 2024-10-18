import { createBot } from "./bot.ts"
import { commandHandler } from "./commands.ts"
import { openaiApiKeyRegex } from "./constant.ts"
import { getMP3Audio } from "./ffmpeg.ts"
import { createSummary, createTranscript } from "./openai.ts"
import { chunkText, handleError } from "./util.ts"

const bot = createBot()
await commandHandler(bot)

bot.on("message:text", async (ctx, next) => {
	const match = ctx.msg.text.match(openaiApiKeyRegex)
	if (!match) return next()

	const [, apiKey] = match
	ctx.session.openaiApiKey = apiKey

	await bot.api.deleteMessage(ctx.chat.id, ctx.msg.message_id)
	await ctx.reply("Stored OpenAI API key.")
})

bot.on([":voice", ":audio", ":video_note", ":video"], async (ctx) => {
	try {
		const video = ctx.msg.video_note ?? ctx.msg.video
		const audio = ctx.msg.voice ?? ctx.msg.audio
		const either = audio ?? video
		if (!either) return ctx.reply("No audio found.")

		const duration = either.duration
		const waitingMessage = await ctx.reply(
			`Transcribing your ${duration}s message...`,
		)

		let transcription: string

		if (audio) {
			const file = await ctx.getFile()
			const response = await fetch(file.getUrl())
			if (!response.body) throw new Error("No response body from Telegram.")

			transcription = await createTranscript(ctx, response)
		} else if (video) {
			const file = await bot.api.getFile(video.file_id)

			const path = file.file_path
			if (!path) return await ctx.reply("No file path found.")

			const mp3 = await getMP3Audio(file.getUrl(), path)

			transcription = await createTranscript(ctx, mp3)
		} else {
			throw new Error("how")
		}

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
