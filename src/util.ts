import type { FVMContext } from "./bot.ts"

export const handleError = async (ctx: FVMContext, error: unknown) => {
	console.error(error)

	if (error instanceof Error) {
		await ctx.reply(
			[
				`An error occurred; <code>${error.message}</code>`,
				"",
				"Make sure to set your <code>OPENAI_API_KEY</code>.",
				"<b>To set it just send it to me and I'll store it.</b>",
			].join("\n"),
			{ parse_mode: "HTML" },
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

export const chunkText = (text: string, chunkSize: number) => {
	return chunkArray([...text], chunkSize).map((chunk) => chunk.join(""))
}

export const wait = (t: number): Promise<void> => {
	return new Promise((r) => setTimeout(r, t))
}
