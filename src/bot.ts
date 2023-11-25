import type { FileFlavor } from "@grammyjs/files"
import type { Context } from "grammy"

import { hydrateFiles } from "@grammyjs/files"
import { Bot } from "grammy"

const { TELEGRAM_BOT_TOKEN } = process.env
if (!TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not defined")

export type MyContext = FileFlavor<Context>

export const bot = new Bot<MyContext>(TELEGRAM_BOT_TOKEN)
export type BotType = typeof bot

bot.api.config.use(hydrateFiles(bot.token))
