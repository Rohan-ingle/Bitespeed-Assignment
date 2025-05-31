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
        <button onclick="checkDb()">Show All Contacts (GET /contacts)</button>
        <button onclick="createDb()">(Re)Create DB (POST /create-database)</button>
        <h3>Test /identify endpoint</h3>
        <form id="identifyForm" onsubmit="testIdentify(event)">
          <label>Email: <input type="text" id="email" name="email"></label>
          <label>Phone Number: <input type="text" id="phoneNumber" name="phoneNumber"></label>
          <button type="submit">Test Identify</button>
        </form>
        <pre id="output"></pre>
        <script>
          function checkDb() {
            fetch('/contacts')
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
          function testIdentify(event) {
            event.preventDefault();
            const email = document.getElementById('email').value || null;
            const phoneNumber = document.getElementById('phoneNumber').value || null;
            fetch('/identify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, phoneNumber })
            })
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
