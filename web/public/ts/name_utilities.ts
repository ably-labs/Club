import {animals, colors, uniqueNamesGenerator} from "unique-names-generator";

export const generateRandomUsername = () => {
    return uniqueNamesGenerator({dictionaries: [colors, animals]})
}

export const pickRandomTailwindColor = () => {
    const tailwindColors = ["gray", "red", "yellow", "green", "blue", "indigo", "purple", "pink"]
    const randomNumber = Math.floor(Math.random() * tailwindColors.length)
    return tailwindColors[randomNumber]
}

export const pickRandomTailwindColorHex = () => {
    const tailwindColors = [
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
    return tailwindColors[randomNumber]
}