require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const databaseUrl = process.env.DATABASE;
const secretKey = process.env.SECRET_KEY;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, "public")));

const client = new MongoClient(databaseUrl);

const db = client.db();
const shortenedURLs = db.collection("shortenedURLs");
const usersCollection = db.collection("users");

const shortenURL = (url, note) => {
  return shortenedURLs.findOne({ original_url: url }).then((existingDoc) => {
    if (existingDoc) {
      const response = {
        urlExists: true,
        value: existingDoc,
      };
      return response; // Return the existing document
    } else {
      const newDocument = {
        original_url: url,
        short_id: nanoid(7),
        note: note,
        clicks: 0,
      };
      return {
        urlExists: true,
        ...shortenedURLs
          .insertOne(newDocument)
          .then(() => ({ value: newDocument })),
      };
    }
  });
};

const checkIfShortIdExists = (code) =>
  shortenedURLs.findOne({ short_id: code });

const incrementClicks = (code) =>
  shortenedURLs.findOneAndUpdate({ short_id: code }, { $inc: { clicks: 1 } });

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const existingUser = await usersCollection.findOne({ username });
  if (existingUser) {
    return res.status(409).json({ error: "Username already exists" });
  }
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = { username, password: hashedPassword };
  await usersCollection.insertOne(newUser);

  res.status(201).json({ message: "User registered successfully" });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await usersCollection.findOne({ username });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign({ username: user.username }, secretKey, {
    expiresIn: "1h",
  });
  res.status(200).json({ token });
});

app.get("/verify", (req, res) => {
  const token = req.headers.authorization.trim();
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const username = decoded.username;
    res.json({ message: `Hello, ${username}! This is a protected route.` });
  });
});

app.get("/autocomplete", (req, res) => {
  const searchTerm = req.query.term;

  if (!searchTerm) {
    return res.status(400).send({ error: "Search term not provided" });
  }
  try {
    let result = shortenedURLs
      .aggregate([
        {
          $search: {
            autocomplete: {
              query: searchTerm,
              path: "autocompleteField",
              fuzzy: {
                maxEdits: 2,
                prefixLength: 3,
              },
            },
          },
        },
        {
          $match: {
            $or: [
              { original_url: { $regex: searchTerm, $options: "i" } },
              { note: { $regex: searchTerm, $options: "i" } },
            ],
          },
        },
      ])
      .toArray();
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal server error" });
  }
});

app.post("/new", (req, res) => {
  let originalUrl;
  try {
    originalUrl = new URL(req.body.url);
  } catch (err) {
    return res.status(400).send({ error: "Invalid URL" });
  }

  dns.lookup(originalUrl.hostname, (err) => {
    if (err) {
      return res.status(404).send({ error: "Address not found" });
    }

    const note = req.body.note || "";

    shortenURL(originalUrl.href, note)
      .then((result) => {
        if (!result || !result.value) {
          throw new Error("Failed to shorten URL");
        }
        res.json({
          urlExists: result.urlExists,
          original_url: result.value.original_url,
          short_id: result.value.short_id,
          note: result.value.note,
          clicks: result.value.clicks,
        });
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send({ error: "Internal server error" });
      });
  });
});

app.get("/all", (req, res) => {
  shortenedURLs
    .find({})
    .toArray()
    .then((urls) => {
      res.json({ results: urls });
    })
    .catch((error) => {
      res
        .status(500)
        .json({ error: "An error occurred while retrieving URLs." });
    });
});

app.get("/search", (req, res) => {
  const searchTerm = req.query.term;

  if (!searchTerm) {
    return res.status(400).send({ error: "Search term not provided" });
  }

  shortenedURLs
    .find({ $text: { $search: searchTerm } })
    .project({ score: { $meta: "textScore" } })
    .sort({ score: { $meta: "textScore" } })
    .toArray()
    .then((docs) => {
      const searchResults = docs.map((doc) => ({
        original_url: doc.original_url,
        short_id: doc.short_id,
        note: doc.note,
        clicks: doc.clicks,
      }));

      res.json({ results: searchResults });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send({ error: "Internal server error" });
    });
});

app.get("/:short_id", (req, res) => {
  const shortId = req.params.short_id;

  checkIfShortIdExists(shortId)
    .then((doc) => {
      if (doc === null)
        return res.send("Uh oh. We could not find a link at that URL");

      res.redirect(doc.original_url);
      incrementClicks(shortId);
    })
    .catch(console.error);
});

app.get("/", (req, res) => {
  const htmlPath = path.join(__dirname, "public", "index.html");
  res.sendFile(htmlPath);
});

app.set("port", process.env.PORT || 4100);
const server = app.listen(app.get("port"), () => {
  console.log(`Express running → PORT ${server.address().port}`);
});
