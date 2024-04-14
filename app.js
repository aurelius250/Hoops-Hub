// Import required modules
const express = require('express');
const mysql = require('mysql');

// Create an instance of Express
const app = express();

// MySQL connection configuration
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Bananas123!',
  database: 'COMP440'
});

// Connect to MySQL database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Define a route to fetch data from the database and render the table
app.get('/', (req, res) => {
  // MySQL query to fetch data
  const sql = 'SELECT * FROM BasketballDatabase';

  // Execute the query
  connection.query(sql, (err, rows) => {
    if (err) {
      console.error('Error executing MySQL query:', err);
      res.status(500).send('Internal Server Error');
      return;
    }

    // Render the table using EJS template engine
    res.render('index', { rows });
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
