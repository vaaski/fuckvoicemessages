import { type FileApiFlavor, FileFlavor, hydrateFiles } from "@grammyjs/files"
import { FileAdapter } from "@grammyjs/storage-file"
import { Api, Bot, Context, session, type SessionFlavor } from "grammy"

import { TELEGRAM_BOT_TOKEN } from "./environment.ts"

const sessionData = {
	openaiApiKey: "",
}
export type FVMContext = FileFlavor<Context> & SessionFlavor<typeof sessionData>
type FVMApi = FileApiFlavor<Api>

export const createBot = () => {
	const bot = new Bot<FVMContext, FVMApi>(TELEGRAM_BOT_TOKEN)
	bot.api.config.use(hydrateFiles(bot.token))
	bot.use(session({
		initial: () => ({ openaiApiKey: "" }),
		storage: new FileAdapter({ dirName: "sessions" }),
	}))

	return bot
}

export type BotType = ReturnType<typeof createBot>
