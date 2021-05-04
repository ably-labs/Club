import {animals, colors, uniqueNamesGenerator} from "unique-names-generator";

export const generateRandomUsername = () => {
    return uniqueNamesGenerator({dictionaries: [colors, animals]})
}