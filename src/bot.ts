import { Bot, Context, session, type SessionFlavor } from "grammy"
import { FileAdapter } from "@grammyjs/storage-file"
import { FileFlavor, hydrateFiles } from "@grammyjs/files"

import { TELEGRAM_BOT_TOKEN } from "./environment.ts"

const sessionData = {
	openaiApiKey: "",
}
export type FVMContext = FileFlavor<Context> & SessionFlavor<typeof sessionData>

export const createBot = () => {
	const bot = new Bot<FVMContext>(TELEGRAM_BOT_TOKEN)
	bot.api.config.use(hydrateFiles(bot.token))
	bot.use(session({
		initial: () => ({ openaiApiKey: "" }),
		storage: new FileAdapter({ dirName: "sessions" }),
	}))

	return bot
}
