import type { BotType } from "./bot.ts"
import { wait } from "./util.ts"

export const commandHandler = async (bot: BotType) => {
	bot.command(["start", "help"], (ctx) => {
		ctx.reply(
			[
				"Send a voice message and I'll transcribe it.",
				"",
				"Make sure to set your <code>OPENAI_API_KEY</code>.",
				"<b>To set it just send it to me and I'll store it.</b>",
			].join("\n"),
			{ parse_mode: "HTML" },
		)
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

		await wait(60e3)

		await ctx.api.deleteMessage(ctx.chat.id, keyMessage.message_id)
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
	])
}
