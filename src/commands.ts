import type { BotType } from "./bot"

import { chunkArray, deleteConfig } from "./util"
import { Keyboard } from "grammy"
import { TTS_VOICES } from "./constants"
import { getConfig, setConfig } from "./config"

export const commandHandler = (botInstance: BotType) => {
  botInstance.api.setMyCommands([
    {
      command: "/help",
      description: "Send the help text.",
    },
    {
      command: "/setvoice",
      description: "Set the voice to use for TTS.",
    },
    {
      command: "/getkey",
      description: "Get your saved OpenAI API key.",
    },
    {
      command: "/deleteconfig",
      description: "Delete your saved config.",
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
      const config = await getConfig(botInstance, ctx.chat.id)
      await ctx.reply(`Your key is: <code>${config.OPENAI_API_KEY}</code>`, {
        parse_mode: "HTML",
      })
    } catch {
      await ctx.reply("No key found.")
    }
  })

  botInstance.command("deleteconfig", async ctx => {
    try {
      await deleteConfig(botInstance, ctx)
    } catch (error) {
      console.error(error)
    }

    await ctx.reply("Deleted saved config.", { reply_to_message_id: ctx.msg.message_id })
  })

  botInstance.command("setvoice", async ctx => {
    const mappedVoices = TTS_VOICES.map(name => Keyboard.text(name))
    const rows = chunkArray(mappedVoices, 2)

    const keyboard = Keyboard.from(rows).resized().oneTime()
    await ctx.reply("Select a voice.", { reply_markup: keyboard })
  })
  botInstance.on(":text", async (ctx, next) => {
    if (!TTS_VOICES.includes(ctx.msg.text)) return next()
    await ctx.reply(`Set voice to ${ctx.msg.text}.`)

    const config = await getConfig(botInstance, ctx.chat.id)
    config.VOICE = ctx.msg.text
    await setConfig(botInstance, ctx.chat.id, config)
  })
}
