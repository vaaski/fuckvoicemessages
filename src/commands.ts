import type { Message } from "grammy/types"
import type { BotType } from "./bot"

import { getKeyFromPinnedMessage } from "./util"

export const commandHandler = (botInstance: BotType) => {
  botInstance.api.setMyCommands([
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

  botInstance.command(["start", "help"], ctx => {
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

  botInstance.command("getkey", async ctx => {
    try {
      const apiKey = await getKeyFromPinnedMessage(ctx.chat.id)
      await ctx.reply(`Your key is: ${apiKey}`)
    } catch {
      await ctx.reply("No key found.")
    }
  })

  botInstance.command("deletekey", async ctx => {
    let pinned_message: Message | undefined

    try {
      do {
        const chat = await botInstance.api.getChat(ctx.chat.id)
        pinned_message = chat.pinned_message
        if (!pinned_message) break

        await botInstance.api.unpinChatMessage(ctx.chat.id, pinned_message.message_id)
        await botInstance.api.deleteMessage(ctx.chat.id, pinned_message.message_id)
      } while (pinned_message)
    } catch (error) {
      console.error(error)
    }

    await ctx.reply("Deleted saved key.", { reply_to_message_id: ctx.msg.message_id })
  })
}
