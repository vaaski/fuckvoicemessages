import { InputFile } from "grammy"

import { bot } from "./bot"
import { getOpenaiInstance, handleError } from "./util"
import { commandHandler } from "./commands"

// reject non-private messages and bots
bot.on("message", (ctx, next) => {
  if (ctx.chat.type !== "private" || ctx.from.is_bot) return
  else next()
})

// log messages
bot.on("message", async (ctx, next) => {
  const { username, first_name, last_name, id } = ctx.msg.from
  const name = username ?? `${first_name} ${last_name}`
  console.log(`new message from [${id}] ${name}`)

  if (ctx.msg.text) console.log(`  ${ctx.msg.text}`)
  else if (ctx.msg.voice) console.log(`  [VOICE] ${ctx.msg.voice.duration}s`)
  else return

  next()
})

commandHandler(bot)

// openai api key handler
const openaiApiKeyRegex = /^sk-[\da-z]{48}$/i
bot.on("message", async (ctx, next) => {
  const text = ctx.msg.text
  if (!text) return next()

  if (openaiApiKeyRegex.test(text)) {
    await ctx.deleteMessage()

    const encoded = Buffer.from(`OPENAI_API_KEY=${text}`).toString("base64")
    const keyStore = await ctx.reply(encoded)

    await bot.api.pinChatMessage(ctx.chat.id, keyStore.message_id)
  } else next()
})

bot.on("message:text", async ctx => {
  try {
    const { text, message_id } = ctx.msg

    const waitingMessage = ctx.reply("Generating...")

    const openai = await getOpenaiInstance(ctx.chat.id)
    const audio = await openai.audio.speech.create({
      input: text,
      model: "tts-1",
      voice: "onyx",
      response_format: "opus",
    })

    if (!audio.body) throw new Error("No audio body")

    await ctx.replyWithVoice(new InputFile(audio.body), {
      reply_to_message_id: message_id,
    })
    const awaitedWaitingMessage = await waitingMessage
    bot.api.deleteMessage(ctx.chat.id, awaitedWaitingMessage.message_id)
  } catch (error) {
    handleError(ctx, error)
  }
})

bot.on("message:voice", async ctx => {
  try {
    const voice = ctx.msg.voice

    const duration = voice.duration
    const waitingMessage = ctx.reply(`Transcribing your ${duration}s voice message.`)

    const file = await ctx.getFile()

    const response = await fetch(file.getUrl())
    if (!response.body) throw new Error("No response body")

    const openai = await getOpenaiInstance(ctx.chat.id)
    const transcription = await openai.audio.transcriptions.create({
      file: response,
      model: "whisper-1",
    })

    const awaitedWaitingMessage = await waitingMessage
    bot.api.deleteMessage(ctx.chat.id, awaitedWaitingMessage.message_id)
    await ctx.reply(transcription.text, { reply_to_message_id: ctx.msg.message_id })
  } catch (error) {
    handleError(ctx, error)
  }
})

console.log("Starting bot...")
await bot.start()
