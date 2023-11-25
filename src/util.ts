import OpenAI from "openai"
import type { MyContext } from "./bot"
import { bot } from "./bot"

export const getKeyFromPinnedMessage = async (chatID: number) => {
  const chat = await bot.api.getChat(chatID)

  const { pinned_message } = chat
  if (!pinned_message) throw new Error("No pinned message found.")
  if (!pinned_message.text) throw new Error("Pinned message is doesn't contain text.")

  const decoded = Buffer.from(pinned_message.text, "base64").toString("utf8")
  const [, apiKey] = decoded.split("=")

  if (!apiKey) throw new Error("No key found in pinned message.")

  return apiKey
}

export const getOpenaiInstance = async (chatID: number): Promise<OpenAI> => {
  const apiKey = await getKeyFromPinnedMessage(chatID)
  return new OpenAI({ apiKey })
}

export const handleError = async (ctx: MyContext, error: unknown) => {
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
