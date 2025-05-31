import { Router } from 'express';
import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('bitespeed.db');

db.run(`
  CREATE TABLE IF NOT EXISTS identities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    phoneNumber TEXT
  )
`);

const router = Router();

router.post('/identify', (req, res) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({ error: 'Email or phoneNumber required' });
  }

  db.get(
    `SELECT * FROM identities WHERE (email = ? AND email IS NOT NULL) OR (phoneNumber = ? AND phoneNumber IS NOT NULL) LIMIT 1`,
    [email, phoneNumber],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (row) {
        // Identity found
        res.json({ identity: row, found: true });
      } else {
        // Insert new identity
        db.run(
          `INSERT INTO identities (email, phoneNumber) VALUES (?, ?)`,
          [email || null, phoneNumber || null],
          function (err) {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }
            db.get(
              `SELECT * FROM identities WHERE id = ?`,
              [this.lastID],
              (err, newRow) => {
                if (err) {
                  return res.status(500).json({ error: 'Database error' });
                }
                res.json({ identity: newRow, found: false });
              }
            );
          }
        );
      }
    }
  );
});

// create with override a new database
router.post('/create-database', (req, res) => {
  db.run(
    `DROP TABLE IF EXISTS identities`,
    [],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to drop table' });
      }
      db.run(
        `CREATE TABLE identities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT,
          phoneNumber TEXT
        )`,
        [],
        (err2) => {
          if (err2) {
            return res.status(500).json({ error: 'Failed to create table' });
          }
          res.json({ message: 'Database (re)created' });
        }
      );
    }
  );
});

// DB test endpoint
router.get('/identities', (req, res) => {
  db.all(`SELECT * FROM identities`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ identities: rows });
  });
});

export default router;
