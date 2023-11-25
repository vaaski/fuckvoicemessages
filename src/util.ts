import type { BotType, MyContext } from "./bot"
import type { Message } from "grammy/types"
import type { CommandContext } from "grammy"

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

export const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks = []

  for (let index = 0; index < array.length; index += chunkSize) {
    chunks.push(array.slice(index, index + chunkSize))
  }

  return chunks
}

export const deleteConfig = async (botInstance: BotType, ctx: CommandContext<MyContext>) => {
  let pinned_message: Message | undefined
  do {
    const chat = await botInstance.api.getChat(ctx.chat.id)
    pinned_message = chat.pinned_message
    if (!pinned_message) break

    await botInstance.api.unpinChatMessage(ctx.chat.id, pinned_message.message_id)
    await botInstance.api.deleteMessage(ctx.chat.id, pinned_message.message_id)
  } while (pinned_message)
}
