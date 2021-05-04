import {animals, colors, uniqueNamesGenerator} from "unique-names-generator";

export const generateRandomUsername = () => {
    return uniqueNamesGenerator({dictionaries: [colors, animals]})
}

export const pickRandomTailwindColor = () => {
    const tailwindColors = ["gray", "red", "yellow", "green", "blue", "indigo", "purple", "pink"]
    const randomNumber = Math.floor(Math.random() * tailwindColors.length)
    return tailwindColors[randomNumber]
}