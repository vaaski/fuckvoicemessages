import { Bot } from "grammy"

const { TELEGRAM_BOT_TOKEN } = process.env
if (!TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not defined")

const bot = new Bot(TELEGRAM_BOT_TOKEN)

bot.on("message:text", ctx => ctx.reply("Echo: " + ctx.message.text))

console.log("Starting bot...")
await bot.start()

export {}
