const generateSlug = (text) => {

    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 ]/g, "")
        .replace(/\s+/g, "-");

};

export default generateSlug;