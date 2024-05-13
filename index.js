import ExifReader from "exifreader";
import { glob } from "glob";
import fs from "fs";

const IMAGE_FILE_EXTENSIONS = "jpg,jpeg,png,heic,heif";

const DEST_FOLDER = "sorted";

(async () => {
  const images = [];
  console.log("Starting script to copy images..");

  if (fs.existsSync(DEST_FOLDER)) {
    console.log("Deleting existing folder..");
    fs.rmdirSync(DEST_FOLDER, { recursive: true });
  }

  console.log("Fetching all files..");
  const files = await glob(`**/*.{${IMAGE_FILE_EXTENSIONS}}`);

  console.log("Extracting image dates..");
  for (const file of files) {
    const tags = await ExifReader.load(file);
    const imageDateRaw = tags["DateTimeOriginal"].description;

    // Convert YYYY:MM:DD to YYYY-MM-DD for JS Date compatibility
    const imageDate = imageDateRaw.replace(
      /(\d{4}):(\d{2}):(\d{2})/,
      "$1-$2-$3"
    );

    images.push({ file, date: imageDate });
  }

  // Sort the array oldest to newest
  console.log("Sorting images from oldest to newest..");
  images.sort((a, b) => {
    return new Date(a.date) - new Date(b.date);
  });

  console.log("Creating 'sorted' folder..");
  fs.mkdirSync(DEST_FOLDER);

  let currentDay = 1;
  let currentDate = getFullDate(images[0].date); // TODO: Use user input if provided. Also check if user input is not ahead of first image

  console.log("Copying images to 'sorted' folder..");
  for (const image of images) {
    const imageDate = getFullDate(image.date);

    if (imageDate !== currentDate) {
      // Get the difference in days between currentDate and imageDate
      // TODO: this could use some refinement
      const diffInTime = new Date(imageDate) - new Date(currentDate);
      const diffInDays = diffInTime / (1000 * 3600 * 24);

      currentDay += Math.round(diffInDays);
      currentDate = getFullDate(imageDate);
    }

    if (!fs.existsSync(`${DEST_FOLDER}/Day ${currentDay}`)) {
      console.log(`Creating folder for 'Day ${currentDay}'..`);
      fs.mkdirSync(`${DEST_FOLDER}/Day ${currentDay}`);
    }

    // Only use the filename for the image, even if its in a subfolders
    const filename = image.file.split("/").pop();

    fs.copyFileSync(image.file, `${DEST_FOLDER}/Day ${currentDay}/${filename}`);
  }
})();

const getFullDate = (date) => {
  const dateFormat = new Date(date);
  return `${dateFormat.getFullYear()}-${
    dateFormat.getMonth() + 1
  }-${dateFormat.getDate()}`;
};
