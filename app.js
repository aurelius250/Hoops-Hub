// Import required modules
const express = require('express');
const mysql = require('mysql');

// Create an instance of Express
const app = express();
app.use(express.json());

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


// Selecting all page commented out due to overriding index.html 
// // Define a route to fetch data from the database and render the table
// app.get('/', (req, res) => {

//   // MySQL query to fetch data
//   const sql = 'SELECT * FROM BasketballDatabase';

//   // Execute the query
//   connection.query(sql, (err, rows) => {
//     if (err) {
//       console.error('Error executing MySQL query:', err);
//       res.status(500).send('Internal Server Error');
//       return;
//     }

//     // Render the table using EJS template engine
//     res.render('index', { rows });
//   });
// });

// Route to fetch players by team name
app.get('/playersByTeam', (req, res) => {
    // Extract the team name from the request query
    const team_name = req.query.team_name; // Use the correct query parameter name
  
    // MySQL query to fetch players for the specified team
    const sql = 'SELECT * FROM BasketballDatabase WHERE team_name = ?';
  
    // Execute the query with the team name parameter
    connection.query(sql, [team_name], (err, rows) => {
      if (err) {
        console.error('Error executing MySQL query:', err);
        res.status(500).send('Internal Server Error');
        return;
      }
  
      // Render the table using EJS template engine
      res.render('team_page', { rows });
    });
  });

// Route to insert player data into the database
app.post('/insertPlayer', (req, res) => {
    // Extract form data from request body
    const { player_name, team_name, position, height, weight, points_per_game, assists_per_game, rebounds_per_game } = req.body;

    // MySQL query to insert player data into BasketballDatabase table
    const sql = 'INSERT INTO BasketballDatabase (player_name, team_name, position, height, weight, points_per_game, assists_per_game, rebounds_per_game) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

    // Execute the query with the form data
    connection.query(sql, [player_name, team_name, position, height, weight, points_per_game, assists_per_game, rebounds_per_game], (err, result) => {
        if (err) {
            console.error('Error inserting player data:', err);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
            return;
        }

        console.log('Player data inserted successfully');
        res.json({ success: true, message: 'Player data inserted successfully' });
    });
});

// Start the server (default)
const PORT = process.env.PORT || 3000;
app.use(express.static('public'));
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


