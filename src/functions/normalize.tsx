
// normalizing is a process of converting a string into a consistent format, usually lowercase and without special characters
// this is useful for searching and comparing strings
export const normalize = (str: string) => str.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
