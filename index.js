require("dotenv").config();
import express from "express";
import multer, { diskStorage } from "multer";
import axios from "axios";
import { existsSync, mkdirSync, readFileSync, unlinkSync } from "fs";
import { join, extname } from "path";

const app = express();
const port = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadDir = join(process.cwd(), "uploads");
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

// Multer setup
const storage = diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + extname(file.originalname)),
});
const upload = multer({ storage });

// Cloudmersive config
const CLOUDMERSIVE_API_KEY = process.env.CLOUDMERSIVE_API_KEY;

// Endpoint: Convert files
app.post("/convert", upload.single("file"), async (req, res) => {
  const { inputFormat, outputFormat } = req.body;
  if (!req.file || !inputFormat || !outputFormat) {
    return res.status(400).json({ error: "file, inputFormat, and outputFormat are required" });
  }

  try {
    const apiUrl = `https://api.cloudmersive.com/convert/${inputFormat}/to/${outputFormat}`;
    const response = await axios.post(apiUrl, readFileSync(req.file.path), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Apikey": CLOUDMERSIVE_API_KEY,
      },
      responseType: "arraybuffer",
    });

    unlinkSync(req.file.path);

    res.set({
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename=converted.${outputFormat}`,
    });
    res.send(response.data);

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Conversion failed" });
  }
});

app.get("/health", (req, res) => res.send({ status: "OK", uptime: process.uptime() }));
app.get("/", (req, res) => res.send("(Almost) Endless Cloudmersive Conversion API is running"));
app.listen(port, () => console.log(`Server running on port ${port}`));
