export interface TailwindColor {
    hexCode: string,
    name: string
}

export const pickRandomTailwindColor = (): TailwindColor => {
    const tailwindColors = ["gray", "red", "yellow", "green", "blue", "indigo", "purple", "pink"]
    const hexCodes = [
        "#6B7280",
        "#B91C1C",
        "#B45309",
        "#059669",
        "#3B82F6",
        "#6366F1",
        "#8B5CF6",
        "#EC4899"
    ]
    const randomNumber = Math.floor(Math.random() * tailwindColors.length)
    return {
        name: tailwindColors[randomNumber],
        hexCode: hexCodes[randomNumber]
    }
}