import { Bot, Context, session, type SessionFlavor } from "grammy"
import { FileAdapter } from "@grammyjs/storage-file"

import { TELEGRAM_BOT_TOKEN } from "./environment.ts"
import { openaiApiKeyRegex } from "./constant.ts"

const sessionData = {
	openaiApiKey: "",
}
type FVMContext = Context & SessionFlavor<typeof sessionData>

const bot = new Bot<FVMContext>(TELEGRAM_BOT_TOKEN)
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

bot.on("message", async (ctx) => {
	await ctx.reply("Hello World!")
})

console.log("starting bot")
bot.start()
