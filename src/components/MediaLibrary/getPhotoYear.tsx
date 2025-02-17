import EXIF from "exif-js";

export const getPhotoYear = (imageFile: string): Promise<string | null> => {
    return new Promise((resolve) => {
        try {
            EXIF.getData(imageFile, function () {
                // @ts-ignore
                const exifDate = EXIF.getTag(this, "DateTimeOriginal");
                if (exifDate) {
                    const year = exifDate.split(":")[0]; // Extract Year
                    resolve(year);
                } else {
                    resolve(null); // No metadata found
                }
            })
        } catch (error) {
            console.error("Error reading EXIF data", error);
            resolve(null);
        }
    });
};
