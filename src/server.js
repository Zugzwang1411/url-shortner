require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const dns = require("dns");
const { MongoClient } = require("mongodb");
const nanoid = require("nanoid");

const databaseUrl = process.env.DATABASE;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, "public")));

MongoClient.connect(databaseUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true,
  w: "majority",
})
  .then((client) => {
    const db = client.db();
    const shortenedURLs = db.collection("shortenedURLs");

    const shortenURL = (url, note) => {
      return shortenedURLs
        .findOne({ original_url: url })
        .then((existingDoc) => {
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
      shortenedURLs.findOneAndUpdate(
        { short_id: code },
        { $inc: { clicks: 1 } }
      );

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
            console.log(result);
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
          res.status(500).json({ error: "An error occurred while retrieving URLs." });
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
          incrementClicks(shortId); // Increment clicks when the short URL is visited
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
  })
  .catch((error) => {
    console.error("Failed to connect to the database", error);
  });
