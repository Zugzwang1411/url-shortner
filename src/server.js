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

MongoClient.connect(databaseUrl, { useNewUrlParser: true })
  .then((client) => {
    app.locals.db = client.db("shortener");
  })
  .catch(() => console.error("Failed to connect to the database"));

  const shortenURL = (db, url) => {
    const shortenedURLs = db.collection("shortenedURLs");
    return shortenedURLs.findOneAndUpdate(
      { original_url: url },
      {
        $setOnInsert: {
          original_url: url,
          short_id: nanoid(7),
        },
      },
      {
        returnOriginal: false,
        upsert: true,
      }
    )
      .then(result => {
        if (result && result.value) {
          return result; // Return the updated document if found
        } else {
          // Insert a new document if no match found
          const newDocument = {
            original_url: url,
            short_id: nanoid(7),
          };
          return shortenedURLs.insertOne(newDocument)
            .then(() => ({ value: newDocument }));
        }
      });
  };
  

const checkIfShortIdExists = (db, code) => db.collection('shortenedURLs')
  .findOne({ short_id: code });

  app.post('/new', (req, res) => {
    let originalUrl;
    try {
      originalUrl = new URL(req.body.url);
    } catch (err) {
      return res.status(400).send({ error: 'Invalid URL' });
    }
  
    dns.lookup(originalUrl.hostname, (err) => {
      if (err) {
        return res.status(404).send({ error: 'Address not found' });
      }
  
      const { db } = req.app.locals;
      shortenURL(db, originalUrl.href)
        .then(result => {
          if (!result || !result.value) {
            throw new Error('Failed to shorten URL');
          }
          const doc = result.value;
          res.json({
            original_url: doc.original_url,
            short_id: doc.short_id,
          });
        })
        .catch(error => {
          console.error(error);
          res.status(500).send({ error: 'Internal server error' });
        });
    });
  });  
  app.get('/search', (req, res) => {
    const searchTerm = req.query.term;
  
    if (!searchTerm) {
      return res.status(400).send({ error: 'Search term not provided' });
    }
  
    const { db } = req.app.locals;
    const shortenedURLs = db.collection("shortenedURLs");
  
    shortenedURLs
      .find({ original_url: { $regex: searchTerm, $options: 'i' } })
      .toArray()
      .then(docs => {
        if (docs.length === 0) {
          return res.send('No matching URLs found');
        }
  
        const searchResults = docs.map(doc => ({
          original_url: doc.original_url,
          short_id: doc.short_id,
        }));
  
        res.json({ results: searchResults });
      })
      .catch(error => {
        console.error(error);
        res.status(500).send({ error: 'Internal server error' });
      });
  });
  
  app.get('/:short_id', (req, res) => {
    const shortId = req.params.short_id;
  
    const { db } = req.app.locals;
    checkIfShortIdExists(db, shortId)
      .then(doc => {
        if (doc === null) return res.send('Uh oh. We could not find a link at that URL');
  
        res.redirect(doc.original_url)
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