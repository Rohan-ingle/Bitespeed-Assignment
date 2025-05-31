import { Router } from 'express';
import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('bitespeed.db');

// update schema
db.run(`
  CREATE TABLE IF NOT EXISTS Contact (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phoneNumber TEXT,
    email TEXT,
    linkedId INTEGER,
    linkPrecedence TEXT CHECK(linkPrecedence IN ('primary', 'secondary')),
    createdAt TEXT,
    updatedAt TEXT,
    deletedAt TEXT
  )
`);

const router = Router();

router.post('/identify', (req, res) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({ error: 'Email or phoneNumber required' });
  }

  // Find all contacts with matching email or phoneNumber
  db.all(
    `SELECT * FROM Contact WHERE (email = ? AND email IS NOT NULL) OR (phoneNumber = ? AND phoneNumber IS NOT NULL) ORDER BY createdAt ASC`,
    [email, phoneNumber],
    (err: Error | null, rows: any[]) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const now = new Date().toISOString();

      if (!rows || rows.length === 0) {
        // if no contact is found then create new primary
        db.run(
          `INSERT INTO Contact (email, phoneNumber, linkedId, linkPrecedence, createdAt, updatedAt, deletedAt) VALUES (?, ?, NULL, 'primary', ?, ?, NULL)`,
          [email || null, phoneNumber || null, now, now],
          function (err: Error | null) {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }
            db.get(
              `SELECT * FROM Contact WHERE id = ?`,
              [this.lastID],
              (err: Error | null, newRow: any) => {
                if (err) {
                  return res.status(500).json({ error: 'Database error' });
                }
                // Response format in JSON
                res.json({
                  contact: {
                    primaryContatctId: newRow.id,
                    emails: [newRow.email].filter(Boolean),
                    phoneNumbers: [newRow.phoneNumber].filter(Boolean),
                    secondaryContactIds: []
                  }
                });
              }
            );
          }
        );
        return;
      }

      // Find all related contacts by traversing for multiple numbers
      const contactIds = rows.map((r: any) => r.id);
      const linkedIds = rows.map((r: any) => r.linkedId).filter(Boolean);
      const allIds = [...contactIds, ...linkedIds];

      db.all(
        `SELECT * FROM Contact WHERE id IN (${allIds.map(() => '?').join(',')}) OR linkedId IN (${allIds.map(() => '?').join(',')})`,
        [...allIds, ...allIds],
        (err2: Error | null, allRelated: any[]) => {
          if (err2) {
            return res.status(500).json({ error: 'Database error' });
          }

          // Find the primary contact by finding oldest contact
          const primaries = allRelated.filter((c: any) => c.linkPrecedence === 'primary');
          let primary = primaries[0];
          for (const p of primaries) {
            if (new Date(p.createdAt) < new Date(primary.createdAt)) {
              primary = p;
            }
          }

          // merge multiple primary numbers if any
          if (primaries.length > 1) {
            for (const p of primaries) {
              if (p.id !== primary.id) {
                db.run(
                  `UPDATE Contact SET linkPrecedence = 'secondary', linkedId = ?, updatedAt = ? WHERE id = ?`,
                  [primary.id, now, p.id]
                );
              }
            }
          }

          // check if information is unique or not 
          const emailExists = allRelated.some((c: any) => c.email === email);
          const phoneExists = allRelated.some((c: any) => c.phoneNumber === phoneNumber);

          let afterInsert = () => {
            // response building
            db.all(
              `SELECT * FROM Contact WHERE id = ? OR linkedId = ?`,
              [primary.id, primary.id],
              (err3: Error | null, related: any[]) => {
                if (err3) {
                  return res.status(500).json({ error: 'Database error' });
                }
                // Compose response
                const emails = Array.from(new Set(related.map((c: any) => c.email).filter(Boolean)));
                const phoneNumbers = Array.from(new Set(related.map((c: any) => c.phoneNumber).filter(Boolean)));
                const secondaryContactIds = related.filter((c: any) => c.linkPrecedence === 'secondary').map((c: any) => c.id);
                res.json({
                  contact: {
                    primaryContatctId: primary.id,
                    emails,
                    phoneNumbers,
                    secondaryContactIds
                  }
                });
              }
            );
          };

          if (
            (!emailExists && email) ||
            (!phoneExists && phoneNumber)
          ) {
            // inserting new contact as secondary
            db.run(
              `INSERT INTO Contact (email, phoneNumber, linkedId, linkPrecedence, createdAt, updatedAt, deletedAt) VALUES (?, ?, ?, 'secondary', ?, ?, NULL)`,
              [email || null, phoneNumber || null, primary.id, now, now],
              function (err4: Error | null) {
                if (err4) {
                  return res.status(500).json({ error: 'Database error' });
                }
                afterInsert();
              }
            );
          } else {
            afterInsert();
          }
        }
      );
    }
  );
});

//  new schema
router.post('/create-database', (req, res) => {
  db.run(
    `DROP TABLE IF EXISTS Contact`,
    [],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to drop table' });
      }
      db.run(
        `CREATE TABLE Contact (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phoneNumber TEXT,
          email TEXT,
          linkedId INTEGER,
          linkPrecedence TEXT CHECK(linkPrecedence IN ('primary', 'secondary')),
          createdAt TEXT,
          updatedAt TEXT,
          deletedAt TEXT
        )`,
        [],
        (err2) => {
          if (err2) {
            return res.status(500).json({ error: 'Failed to create table' });
          }
          res.json({ message: 'Database (re)created with Contact schema' });
        }
      );
    }
  );
});

// DB test endpoint
router.get('/contacts', (req, res) => {
  db.all(`SELECT * FROM Contact`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ contacts: rows });
  });
});

export default router;
