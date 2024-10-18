import "@std/dotenv/load"

const getVariable = (key: string, defaultValue?: string) => {
	const value = Deno.env.get(key)

	if (value) return value
	if (defaultValue !== undefined) return defaultValue

	throw new Error(`Environment variable ${key} is not set`)
}

export const TELEGRAM_BOT_TOKEN = getVariable("TELEGRAM_BOT_TOKEN")
