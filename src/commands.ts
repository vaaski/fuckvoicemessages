import type { BotType } from "./bot.ts"
import { helpText } from "./constant.ts"
import { wait } from "./util.ts"

export const commandHandler = async (bot: BotType) => {
	bot.command(["start", "help"], (ctx) => {
		ctx.reply(helpText, { parse_mode: "HTML" })
	})

	bot.command("getkey", async (ctx) => {
		const key = ctx.session.openaiApiKey
		if (!key) return ctx.reply("No key found.")

		const keyMessage = await ctx.reply(
			[
				`Your key is: <code>${key}</code>`,
				"",
				"This message will self-destruct in 60s to protect your key.",
			].join("\n"),
			{ parse_mode: "HTML" },
		)

		wait(60e3).then(() => {
			ctx.api.deleteMessage(ctx.chat.id, keyMessage.message_id)
		})
	})

	bot.command("delkey", async (ctx) => {
		ctx.session.openaiApiKey = ""
		await ctx.reply("Deleted saved key.")
	})

	await bot.api.setMyCommands([
		{
			command: "/start",
			description: "Send the start text again.",
		},
		{
			command: "/help",
			description: "Send the help text.",
		},
		{
			command: "/getkey",
			description: "Get your saved OpenAI API key.",
		},
		{
			command: "/delkey",
			description: "Delete your saved OpenAI API key.",
		},
	])
}
