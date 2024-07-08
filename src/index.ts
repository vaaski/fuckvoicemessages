import { InputFile } from "grammy"

import OpenAI from "openai"
import { bot } from "./bot"
import { commandHandler } from "./commands"
import { getConfig, setConfig } from "./config"
import { chunkArray, handleError } from "./util"

// reject non-private messages and bots
bot.on("message", async (ctx, next) => {
  if (ctx.chat.type !== "private" || ctx.from.is_bot) return
  await next()
})

// log messages
bot.on("message", async (ctx, next) => {
  const { username, first_name, last_name, id } = ctx.msg.from
  const name = username ?? `${first_name} ${last_name}`
  console.log(`new message from [${id}] ${name}`)

  if (ctx.msg.voice) console.log(`  [VOICE] ${ctx.msg.voice.duration}s`)
  else if (ctx.msg.audio) console.log(`  [AUDIO] ${ctx.msg.audio.duration}s`)
  else console.log(`  ${ctx.msg.text}`)

  await next()
})

commandHandler(bot)

// openai api key handler
const openaiApiKeyRegex = /^sk-[\da-z]{48}$/i
bot.on("message", async (ctx, next) => {
  const text = ctx.msg.text
  if (!text) return next()

  if (openaiApiKeyRegex.test(text)) {
    await ctx.deleteMessage()

    const config = await getConfig(bot, ctx.chat.id)
    config.OPENAI_API_KEY = text
    await setConfig(bot, ctx.chat.id, config)
  }
  await next()
})

bot.on(["message:voice", "message:audio"], async ctx => {
  try {
    const audio = ctx.msg.voice ?? ctx.msg.audio
    if (!audio) return ctx.reply("No audio found.")

    const duration = audio.duration
    const waitingMessage = ctx.reply(`Transcribing your ${duration}s voice message...`)

    const file = await ctx.getFile()
    const response = await fetch(file.getUrl())
    if (!response.body) throw new Error("No response body")

    const config = await getConfig(bot, ctx.chat.id)
    if (!config.OPENAI_API_KEY) throw new Error("No OpenAI API key found.")

    const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY })

    const transcription = await openai.audio.transcriptions.create({
      file: response,
      model: "whisper-1",
    })

    const awaitedWaitingMessage = await waitingMessage
    bot.api.deleteMessage(ctx.chat.id, awaitedWaitingMessage.message_id)
    if (transcription.text.length > 4000) {
      const chunks = chunkArray([...transcription.text], 4000).map(chunk =>
        chunk.join("")
      )

      for (const chunk of chunks) {
        await ctx.reply(chunk, { reply_to_message_id: ctx.msg.message_id })
      }
    } else {
      await ctx.reply(transcription.text, { reply_to_message_id: ctx.msg.message_id })
    }

    if (transcription.text.length > 500) {
      const summarizingWaitingMessage = await ctx.reply("Summarizing...")
      const summary = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.3,
        max_tokens: 1024,
        messages: [
          {
            role: "system",
            content:
              "You summarize a transcription of a voice message into bullet points. Keep the original language and point of view.",
          },
          {
            role: "user",
            content: transcription.text,
          },
        ],
      })

      const response = summary.choices[0].message.content
      if (!response) throw new Error("No response")
      await ctx.reply(response, { reply_to_message_id: ctx.msg.message_id })
      bot.api.deleteMessage(ctx.chat.id, summarizingWaitingMessage.message_id)
    }
  } catch (error) {
    handleError(ctx, error)
  }
})

bot.on("message:text", async ctx => {
  try {
    const { text, message_id } = ctx.msg

    const waitingMessage = ctx.reply("Generating...")

    const config = await getConfig(bot, ctx.chat.id)
    if (!config.OPENAI_API_KEY) throw new Error("No OpenAI API key found.")

    const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY })

    const audio = await openai.audio.speech.create({
      input: text,
      model: "tts-1",
      voice: config.VOICE,
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

console.log("Starting bot...")
await bot.start()
