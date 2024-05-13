import ExifReader from "exifreader";
import { glob } from "glob";
import fs from "fs";

const IMAGE_FILE_EXTENSIONS = "jpg,jpeg,png,heic,heif";

const DEST_FOLDER = "sorted";

// TODO: add readme
// TODO: Maybe create new day at midnight 3am (could be considered the same day)

(async () => {
  const images = [];
  // let path_to_images = "";
  
  const args = process.argv.slice(2);

  const pathArg = args.find((arg) => arg.startsWith('--path='))?.split('=')[1];
  const startDateArg = args.find((arg) => arg.startsWith('--startDate='))?.split('=')[1];

  const path_to_images = pathArg || "";
  const full_dest_folder = `${path_to_images}/${DEST_FOLDER}`;

  console.log(`Starting script to copy images for path: "${path_to_images}"..`);

  if (!fs.existsSync(path_to_images)) {
    console.error(`Folder ${path_to_images} does not exist. Exiting..`);
    process.exit(1);
  }

  if (fs.existsSync(full_dest_folder)) {
    console.log("Deleting existing folder..");
    fs.rmdirSync(full_dest_folder, { recursive: true });
  }

  console.log("Fetching all files..");
  const files = await glob(`${path_to_images}/**/*.{${IMAGE_FILE_EXTENSIONS}}`);

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
  fs.mkdirSync(full_dest_folder);

  let currentDay = 1;
  // If user input is provided we use that
  let currentDate = startDateArg ? getFullDate(startDateArg) : getFullDate(images[0].date);

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

    if (!fs.existsSync(`${full_dest_folder}/Day ${currentDay}`)) {
      console.log(`Creating folder for 'Day ${currentDay}'..`);
      fs.mkdirSync(`${full_dest_folder}/Day ${currentDay}`);
    }

    // Only use the filename for the image, even if its in a subfolders
    const filename = image.file.split("/").pop();

    fs.copyFileSync(
      image.file,
      `${full_dest_folder}/Day ${currentDay}/${filename}`
    );
  }
})();

const getFullDate = (date) => {
  const dateFormat = new Date(date);
  return `${dateFormat.getFullYear()}-${
    dateFormat.getMonth() + 1
  }-${dateFormat.getDate()}`;
};
