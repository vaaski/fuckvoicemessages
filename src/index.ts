import { execa } from "execa"
import got from "got"
import { Bot, GrammyError, HttpError } from "grammy"
import { createReadStream, createWriteStream } from "node:fs"
import { mkdir, unlink } from "node:fs/promises"
import { dirname, extname, join, parse } from "node:path"
import { Stream } from "node:stream"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

const __dirname = dirname(fileURLToPath(import.meta.url))
const pipeline = promisify(Stream.pipeline)

const { TELEGRAM_BOT_TOKEN, WHISPER_BIN, WHISPER_MODEL } = process.env
if (!TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not defined")
if (!WHISPER_BIN) throw new Error("WHISPER_BIN is not defined")
if (!WHISPER_MODEL) throw new Error("WHISPER_MODEL is not defined")

const bot = new Bot(TELEGRAM_BOT_TOKEN)

const getFileURL = (file_path: string) => {
  return `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${file_path}`
}
const convertToWAV = async (inputPath: string) => {
  const parsed = parse(inputPath)
  const outputPath = join(parsed.dir, `${parsed.name}.wav`)

  await execa("ffmpeg", [
    "-i",
    inputPath,
    "-ar",
    "16000",
    "-ac",
    "1",
    "-c:a",
    "pcm_s16le",
    "-y",
    outputPath,
  ])

  return outputPath
}

const transcribe = async (inputPath: string, replier: (input: string) => void) => {
  const transcriber = execa(WHISPER_BIN, ["-m", WHISPER_MODEL, "-l", "auto", "-nt", "-"])
  if (!transcriber.stdin) throw new Error("no transcriber stdin")
  if (!transcriber.stdout) throw new Error("no transcriber stdout")

  transcriber.stdout.on("data", data => {
    const dataString: string | undefined = data.toString().trim()
    if (!dataString) return

    console.log(dataString)
    replier(dataString)
  })

  const fileStream = createReadStream(inputPath)
  await pipeline(fileStream, transcriber.stdin)
  await transcriber
}

bot.command("start", context => context.reply("yo"))
bot.on(["message:audio", "message:voice"], async context => {
  const audio = context.message.audio ?? context.message.voice
  if (!audio) return context.reply("no audio")

  const file = await context.getFile()
  const path = file.file_path
  if (!path) return context.reply("no path")

  const extension = extname(path).replace(".", "")
  const url = getFileURL(path)
  const destination = join(
    __dirname,
    "../temp.local",
    `${file.file_unique_id}.${extension}`
  )

  const transcribeResponse = await context.reply("processing...")
  const request = got.stream(url)
  const writeStream = createWriteStream(destination)

  await pipeline(request, writeStream)
  const wavPath = await convertToWAV(destination)

  await unlink(destination)

  await transcribe(wavPath, context.reply.bind(context))
  await context.api.deleteMessage(context.chat.id, transcribeResponse.message_id)

  await unlink(wavPath)
})

// eslint-disable-next-line unicorn/prefer-top-level-await
bot.catch(rawError => {
  const context = rawError.ctx
  console.error(`Error while handling update ${context.update.update_id}:`)
  const error = rawError.error

  if (error instanceof GrammyError) {
    console.error("Error in request:", error.description)
  } else if (error instanceof HttpError) {
    console.error("Could not contact Telegram:", error)
  } else {
    console.error("Unknown error:", error)
  }
})

await mkdir(join(__dirname, "../temp.local"), { recursive: true })

console.log("running bot")
await bot.start()
