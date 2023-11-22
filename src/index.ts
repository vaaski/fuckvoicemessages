import { Bot, InputFile } from "grammy"
import OpenAI from "openai"

const { TELEGRAM_BOT_TOKEN, OPENAI_API_KEY } = process.env
if (!TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not defined")
if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not defined")

const bot = new Bot(TELEGRAM_BOT_TOKEN)
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

bot.on("message:text", async ctx => {
  console.log(ctx.message.text)
  const waitingMessage = ctx.reply("generating...")

  const audio = await openai.audio.speech.create({
    input: ctx.message.text,
    model: "tts-1",
    voice: "onyx",
    response_format: "opus",
  })

  if (!audio.body) throw new Error("No audio body")

  bot.api.deleteMessage(ctx.chat.id, (await waitingMessage).message_id)
  await ctx.replyWithVoice(new InputFile(audio.body))
})

console.log("Starting bot...")
await bot.start()

export {}
