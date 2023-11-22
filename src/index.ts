import { FileFlavor, hydrateFiles } from "@grammyjs/files"
import { Bot, Context, InputFile } from "grammy"
import OpenAI from "openai"

const { TELEGRAM_BOT_TOKEN, OPENAI_API_KEY } = process.env
if (!TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not defined")
if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not defined")

type MyContext = FileFlavor<Context>
const bot = new Bot<MyContext>(TELEGRAM_BOT_TOKEN)
bot.api.config.use(hydrateFiles(bot.token))

const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

bot.command("start", ctx => {
  ctx.reply(
    "Send text and I'll read it out loud. Send a voice message and I'll transcribe it."
  )
})

bot.api.setMyCommands([{ command: "/start", description: "Send the start text again" }])

bot.on("message", async (ctx, next) => {
  const { username, first_name, last_name, id } = ctx.msg.from
  const name = username ?? `${first_name} ${last_name}`
  console.log(`new message from [${id}] ${name}`)

  if (ctx.msg.text) console.log(`  ${ctx.msg.text}`)
  else if (ctx.msg.voice) console.log(`  [VOICE] ${ctx.msg.voice.duration}s`)
  else console.log(`  something fucked`)

  next()
})

bot.on("message:text", async ctx => {
  const { text } = ctx.message

  const waitingMessage = ctx.reply("Generating...")

  const audio = await openai.audio.speech.create({
    input: text,
    model: "tts-1",
    voice: "onyx",
    response_format: "opus",
  })

  if (!audio.body) throw new Error("No audio body")

  bot.api.deleteMessage(ctx.chat.id, (await waitingMessage).message_id)
  await ctx.replyWithVoice(new InputFile(audio.body))
})

bot.on("message:voice", async ctx => {
  const voice = ctx.msg.voice

  const duration = voice.duration
  const waitingMessage = ctx.reply(`Transcribing your ${duration}s voice message.`)

  const file = await ctx.getFile()

  const response = await fetch(file.getUrl())
  if (!response.body) throw new Error("No response body")

  const transcription = await openai.audio.transcriptions.create({
    file: response,
    model: "whisper-1",
  })

  bot.api.deleteMessage(ctx.chat.id, (await waitingMessage).message_id)
  await ctx.reply(transcription.text)
})

console.log("Starting bot...")
await bot.start()
