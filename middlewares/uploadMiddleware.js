const multer = require("multer");
const path = require("path");

// Set up storage engine for images and videos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Separate directories for images and videos
    if (file.fieldname === "images") {
      cb(null, "./uploads/images");
    } else if (file.fieldname === "video") {
      cb(null, "./uploads/videos");
    }
  },
  filename: function (req, file, cb) {
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

// Check file type for images
function checkImageFileType(file, cb) {
  const filetypes = /jpeg|jpg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb("Error: Images only!");
  }
}

// Check file type for videos
function checkVideoFileType(file, cb) {
  const filetypes = /mp4|mov|avi|mkv/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb("Error: Videos only!");
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 10000000 }, // Limit file size to 10MB (for videos)
  fileFilter: function (req, file, cb) {
    if (file.fieldname === "images") {
      checkImageFileType(file, cb);
    } else if (file.fieldname === "video") {
      checkVideoFileType(file, cb);
    }
  },
});

module.exports = upload;
