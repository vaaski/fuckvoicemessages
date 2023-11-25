import type { FileFlavor } from "@grammyjs/files"
import type { Context } from "grammy"
import type { Message } from "grammy/types"

import { hydrateFiles } from "@grammyjs/files"
import { Bot, InputFile } from "grammy"
import OpenAI from "openai"

const { TELEGRAM_BOT_TOKEN } = process.env
if (!TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not defined")

type MyContext = FileFlavor<Context>
const bot = new Bot<MyContext>(TELEGRAM_BOT_TOKEN)
bot.api.config.use(hydrateFiles(bot.token))

bot.api.setMyCommands([
  {
    command: "/help",
    description: "Send the help text.",
  },
  {
    command: "/getkey",
    description: "Get your saved OpenAI API key.",
  },
  {
    command: "/deletekey",
    description: "Delete your saved OpenAI API key.",
  },
  {
    command: "/start",
    description: "Send the start text again.",
  },
])

const getKeyFromPinnedMessage = async (chatID: number) => {
  const chat = await bot.api.getChat(chatID)

  const { pinned_message } = chat
  if (!pinned_message) throw new Error("No pinned message found.")
  if (!pinned_message.text) throw new Error("Pinned message is doesn't contain text.")

  const decoded = Buffer.from(pinned_message.text, "base64").toString("utf8")
  const [, apiKey] = decoded.split("=")

  if (!apiKey) throw new Error("No key found in pinned message.")

  return apiKey
}

const getOpenaiInstance = async (chatID: number): Promise<OpenAI> => {
  const apiKey = await getKeyFromPinnedMessage(chatID)
  return new OpenAI({ apiKey })
}

const handleError = async (ctx: Context, error: unknown) => {
  console.error(error)

  if (error instanceof Error) {
    await ctx.reply(
      [
        `An error occurred; <code>${error.message}</code>`,
        "Make sure you've set an <code>OPENAI_API_KEY</code>.",
        "",
        "To set it just send it to me and I'll store it encoded in a pinned message.",
      ].join("\n"),
      { parse_mode: "HTML" }
    )
  } else {
    await ctx.reply("An unknown error occurred.")
  }
}

bot.on("message", (ctx, next) => {
  if (ctx.chat.type !== "private" || ctx.from.is_bot) return
  else next()
})

bot.command(["start", "help"], ctx => {
  ctx.reply(
    [
      "Send text and I'll read it out loud.",
      "Send a voice message and I'll transcribe it.",
      "",
      "Make sure to set your <code>OPENAI_API_KEY</code>.",
      "To set it just send it to me and I'll store it encoded in a pinned message.",
    ].join("\n"),
    { parse_mode: "HTML" }
  )
})

bot.command("getkey", async ctx => {
  try {
    const apiKey = await getKeyFromPinnedMessage(ctx.chat.id)
    await ctx.reply(`Your key is: ${apiKey}`)
  } catch {
    await ctx.reply("No key found.")
  }
})

bot.command("deletekey", async ctx => {
  let pinned_message: Message | undefined

  do {
    const chat = await bot.api.getChat(ctx.chat.id)
    pinned_message = chat.pinned_message
    if (!pinned_message) break

    await bot.api.unpinChatMessage(ctx.chat.id, pinned_message.message_id)
    await bot.api.deleteMessage(ctx.chat.id, pinned_message.message_id)
  } while (pinned_message)

  await ctx.reply("Deleted saved key.", { reply_to_message_id: ctx.msg.message_id })
})

bot.on("message", async (ctx, next) => {
  const { username, first_name, last_name, id } = ctx.msg.from
  const name = username ?? `${first_name} ${last_name}`
  console.log(`new message from [${id}] ${name}`)

  if (ctx.msg.text) console.log(`  ${ctx.msg.text}`)
  else if (ctx.msg.voice) console.log(`  [VOICE] ${ctx.msg.voice.duration}s`)
  else return

  next()
})

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
