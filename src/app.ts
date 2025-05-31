import express from 'express';
import identityRoutes from './routes/identity';

const app = express();
app.use(express.json());

// Mount at root so /create-database works
app.use(identityRoutes);

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Bitespeed Identity Reconciliation Service</title>
      </head>
      <body>
        <h1>Bitespeed Identity Reconciliation Service</h1>
        <button onclick="checkDb()">Check DB (GET /identities)</button>
        <button onclick="createDb()">(Re)Create DB (POST /create-database)</button>
        <pre id="output"></pre>
        <script>
          function checkDb() {
            fetch('/identities')
              .then(res => res.json())
              .then(data => {
                document.getElementById('output').textContent = JSON.stringify(data, null, 2);
              })
              .catch(e => {
                document.getElementById('output').textContent = 'Error: ' + e;
              });
          }
          function createDb() {
            fetch('/create-database', { method: 'POST' })
              .then(res => res.json())
              .then(data => {
                document.getElementById('output').textContent = JSON.stringify(data, null, 2);
              })
              .catch(e => {
                document.getElementById('output').textContent = 'Error: ' + e;
              });
          }
        </script>
      </body>
    </html>
  `);
});

export default app;
