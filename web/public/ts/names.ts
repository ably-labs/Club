import {adjectives, animals, uniqueNamesGenerator} from "unique-names-generator";

export const generateRandomUsername = () => {
    return uniqueNamesGenerator({dictionaries: [adjectives, animals]})
}