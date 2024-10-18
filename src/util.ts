import type { FVMContext } from "./bot.ts"

export const handleError = async (ctx: FVMContext, error: unknown) => {
	console.error(error)

	if (error instanceof Error) {
		await ctx.reply(
			[
				`An error occurred; <code>${error.message}</code>`,
				"Make sure you've set an <code>OPENAI_API_KEY</code>.",
				"",
				"To set it just send it to me and I'll store it encoded in a pinned message.",
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
