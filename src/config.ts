import type { BotType } from "./bot"
import { TTS_VOICES } from "./constants"

export const DEFAULT_CONFIG = {
  OPENAI_API_KEY: "",
  VOICE: TTS_VOICES[0],
}

export const getConfig = async (bot: BotType, chatID: number) => {
  const chat = await bot.api.getChat(chatID)

  const { pinned_message } = chat
  if (!pinned_message?.text) return DEFAULT_CONFIG

  const rows = pinned_message.text.split("\n")
  const configEntries = rows.map(row => {
    const [key, value] = row.split("=")

    if (key === "OPENAI_API_KEY") {
      return [key, Buffer.from(value, "base64").toString("utf8")]
    } else return [key, value]
  })

  return Object.fromEntries(configEntries)
}

export const setConfig = async (
  bot: BotType,
  chatID: number,
  config: Record<string, string>
) => {
  const rows = Object.entries(config).map(([key, value]) => {
    if (key === "OPENAI_API_KEY") return `${key}=${Buffer.from(value).toString("base64")}`
    else return `${key}=${value}`
  })
  const text = rows.join("\n")

  const chat = await bot.api.getChat(chatID)

  const { pinned_message } = chat
  if (pinned_message) {
    await bot.api.editMessageText(chatID, pinned_message.message_id, text)
  } else {
    const store = await bot.api.sendMessage(chatID, text)
    await bot.api.pinChatMessage(chatID, store.message_id)
  }
}
