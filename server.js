const express = require("express");
const app = express();

const path = require("path");
const session = require("express-session");
const sqlite3 = require("sqlite3").verbose();
const { hashPassword, comparePassword } = require("./lib/hash-password");

const db = new sqlite3.Database("./sqlite/username.db");

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use(
  session({
    secret: "key-secret",
    resave: false,
    saveUninitialized: false,
  })
);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS username (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      password TEXT NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS trails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      startingPoint TEXT NOT NULL,
      location TEXT NOT NULL,
      distance REAL NOT NULL,
      image TEXT NOT NULL,
      user TEXT NOT NULL
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trail_id INTEGER NOT NULL,
      rating INTEGER NOT NULL,
      user TEXT NOT NULL,
      FOREIGN KEY (trail_id) REFERENCES trails(id)
    )
  `);
  
  
  
});

app.post("/login", (req, res) => {
  const { username, password, isNewUser } = req.body;

  if (!username || !password) {
        return res.status(400).json({ message: "enter username and password CORRECTLY." });
  }

  db.get("SELECT * FROM username WHERE name = ?", [username], (err, user) => {
    if (err) {
      console.error("data err:", err);
      return res.status(500).json({ message: "Server error" });
    }

    if (isNewUser) {
      if (user) {
        return res.status(409).json({ message: "user already exists." });
      }

      hashPassword(password).then((hashed) => {
        db.run(
          "INSERT INTO username (name, password) VALUES (?, ?)",
          [username, hashed],
          (err) => {
            if (err) {
              console.error("sign in error", err);
              return res.status(500).json({ message: "error" });
            }
            req.session.username = username;
            return res.status(200).json({ message: "succes" });
          }
        );
      });
      return;
    }

    if (!user) {
      return res.status(401).json({ message: "user not found." });
    }

    comparePassword(password, user.password).then((isValid) => {
      if (!isValid) {
        return res.status(401).json({ message: "password error" });
      }
      req.session.username = username;
      res.status(200).json({ message: "succes" });
    });
  });
});

app.get("/me", (req, res) => {
  if (req.session && req.session.username) {
    res.json({ username: req.session.username });
  } else {
    res.status(401).json({ message: "Not logged in" });
  }
});
app.post("/submit-trail", (req, res) => {
  const { title, description, difficulty, startingPoint, location, distance, image } = req.body;

  if (!req.session.username) {
    return res.status(401).json({ message: "not logged in" });
  }

  if (!title || !description || !difficulty || !startingPoint || !image) {
    return res.status(400).json({ message: "PLEASE enter all" });
  }

  const user = req.session.username;

  db.run(
    "INSERT INTO trails (title, description, difficulty, startingPoint, location, distance, image, user) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [title, description, difficulty, startingPoint, location, distance, image, user],
  
  
    (err) => {
      if (err) {
        console.error("data error", err);
        return res.status(500).json({ message: "Server error." });
      }

      res.status(200).json({ message: "trail uploaded succesfully" });
    }
  );
});



app.get("/trails", (req, res) => {
    const { sort } = req.query;
  
    let query = `
      SELECT 
        trails.*, 
        ROUND(AVG(ratings.rating), 1) AS avgRating 
      FROM trails
      LEFT JOIN ratings ON trails.id = ratings.trail_id
      GROUP BY trails.id
    `;
  
    if (sort === "title_asc") {
      query += " ORDER BY trails.title ASC";
    } else if (sort === "title_desc") {
      query += " ORDER BY trails.title DESC";
    }
  
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error("data error:", err);
        return res.status(500).json({ message: "Server error" });
      }
      res.json(rows);
    });
  });
  

app.get("/trail/:id", (req, res) => {
  const id = req.params.id;
  const user = req.session.username || null;

  db.get("SELECT * FROM trails WHERE id = ?", [id], (err, trail) => {
    if (err || !trail) {
      return res.status(404).json({ message: "Not found" });
    }

    db.get(
      "SELECT AVG(rating) AS avgRating FROM ratings WHERE trail_id = ?",
      [id],
      (err2, ratingRow) => {
        if (err2) {
          console.error("Rating data error:", err2);
          return res.status(500).json({ message: "error" });
        }

        trail.avgRating = ratingRow.avgRating
          ? parseFloat(ratingRow.avgRating).toFixed(1)
          : "0.0";

        if (!user) return res.json(trail);
        db.get(
          "SELECT rating FROM ratings WHERE trail_id = ? AND user = ?",
          [id, user],
          (err3, userRatingRow) => {
            if (err3) {
              console.error("data collect error:", err3);
              return res.status(500).json({ message: "error" });
            }

            trail.userRating = userRatingRow ? userRatingRow.rating : null;

            res.json(trail);
          }
        );
      }
    );
  });
});

app.post("/rate", (req, res) => {
  if (!req.session.username) {
    return res.status(401).json({ message: "PLEASE log in." });
  }

  const { trailId, rating } = req.body;
  const user = req.session.username;

  if (!trailId || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "data error" });
  }
  db.get(
    "SELECT * FROM ratings WHERE trail_id = ? AND user = ?",
    [trailId, user],
    (err, row) => {
      if (err) return res.status(500).json({ message: "error" });

      if (row) {
        return res.status(400).json({ message: "already rated." });
      }
      db.run(
        "INSERT INTO ratings (trail_id, rating, user) VALUES (?, ?, ?)",
        [trailId, rating, user],
        (err2) => {
          if (err2) {
            console.error("Rating upload error:", err2);
            return res.status(500).json({ message: "Server error" });
          }

          res.status(200).json({ message: "Rating success" });
        }
      );
    }
  );
});






const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`server: http://localhost:${PORT}`);
});