import * as path from "jsr:@std/path"
import OpenAI from "openai"

export const getMP3Audio = async (fileUrl: string, filePath: string) => {
	const tempPath = await Deno.makeTempDir()
	const outputPath = path.join(tempPath, filePath)
	const outputDir = path.dirname(outputPath)

	await Deno.mkdir(outputDir, { recursive: true })

	const request = await fetch(fileUrl)
	if (!request.body) throw new Error("No response body from Telegram.")

	await Deno.writeFile(outputPath, request.body)

	const args = [
		"-i", // ffmpeg is not smart enough to guess the input format 😀😀😀😀😀😀😀😀😀😀😀😀
		outputPath,
		"-map", // only audio
		"0:a",
		"-ac", // mono
		"1",
		"-af", // normalize audio
		"loudnorm",
		"-acodec",
		"libmp3lame",
		"-b:a", // set bitrate
		"128k",
		"-f", // explicit output format
		"mp3",
		"pipe:1", // output -> stdout
	]

	const ffmpeg = new Deno.Command("ffmpeg", {
		stdout: "piped",
		args,
	})

	const { stdout } = await ffmpeg.output()

	await Deno.remove(outputPath, { recursive: true })

	return await OpenAI.toFile(stdout, "upload.mp3", { type: "mp3" })
}
