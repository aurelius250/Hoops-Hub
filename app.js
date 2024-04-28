// Import required modules
const express = require('express');
const mysql = require('mysql2');
const axios = require('axios');

// Create an instance of Express
const app = express();
app.use(express.json());

// MySQL connection configuration
const connection = mysql.createConnection({
  port: 3306,
  host: '127.0.0.1',
  user: 'root',
  password: '***REMOVED***',
  database: 'hoops_hub',
}).promise();

//Connect to MySQL database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

const fetchPlayerIDs = async () => {
  try {
      const response = await fetch('https://api.balldontlie.io/v1/players');
      const data = await response.json();
      return data.data.map(player => player.id);
  } catch (error) {
      console.error('Error fetching player IDs:', error);
      throw error;
  }
};


const fetchPlayerStats = async (playerID) => {
  try {
      const response = await fetch(`https://api.balldontlie.io/v1/season_averages?season=2023&player_ids[]=${playerID}`);
      const data = await response.json();
      return data.data[0]; // Assuming only one set of stats is returned per player
  } catch (error) {
      console.error(`Error fetching stats for player ${playerID}:`, error);
      throw error;
  }
};

// Function to convert weight string to kilograms
function convertWeightToKilograms(weightString) {
  const pounds = parseInt(weightString);
  const kilograms = pounds * 0.453592; // 1 pound = 0.453592 kg
  const roundedKilograms = Math.round(kilograms);
  return roundedKilograms;
}


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
    const sql = 'SELECT * FROM players WHERE team_name = ?';
  
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

  const fetchPlayerData = async () => {
    try {
      const players = [];
      const playerIds = Array.from({ length: 25 }, (_, index) => index + 1);
      
      for (const playerId of playerIds) {
        const url = `https://api.balldontlie.io/v1/players/${playerId}`;
  
        const response = await axios.get(url, {
          headers: {
            'Authorization': '***REMOVED***'
          }
        });
  
        const playerData = response.data;
        players.push({
          player_id: playerData.id,
          full_name: `${playerData.first_name} ${playerData.last_name}`,
          weight_kg: convertWeightToKilograms(playerData.weight)
          // Add other fields as needed
        });
      }
  
      return players;
    } catch (error) {
      console.error('Error fetching player data:', error);
      throw error;
    }
  };
  
  // Route to insert player data into the database
  app.post('/insertPlayer', async (req, res) => {
    try {
      // Fetch player data from the API
      console.log('Request received to insert player data');
      const players = await fetchPlayerData();
  
      // MySQL query to insert player data into BasketballDatabase table
      const sql = 'INSERT INTO players (player_id, full_name, position, team_name, height, weight) VALUES (?, ?, ?, ?, ?, ?)';
  
      // Execute the query for each player
      players.forEach(async (player) => {
        await connection.query(sql, [player.id, player.full_name, player.position, player.team.full_name, player.height, player.weight_kg]);
      });
  
      console.log('Player data inserted successfully');
      res.json({ success: true, message: 'Player data inserted successfully' });
    } catch (error) {
      console.error('Error inserting player data:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  });

  app.post('/insertPlayerAverages', async (req, res) => {
    try {
      // Fetch player averages from the API
      const playerAverages = await fetchPlayerStats();

      // MySQL query to insert player data into BasketballDatabase table
      const sql = 'INSERT INTO players (points_per_game, assists_per_game, rebounds_per_game, three_perc, fg_perc) VALUES (?, ?, ?, ?, ?)';
  
      // Iterate over each player average and insert data into the database
      for (const average of playerAverages) {
        await connection.query(sql, [average.pts, average.ast, average.reb, average.fg3_pct, average.fg_pct]);
      }
  
      console.log('Player data inserted successfully');
      res.json({ success: true, message: 'Player data inserted successfully' });
    } catch (error) {
      console.error('Error inserting player data:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  });

// Route to delete player by ID
app.delete('/deletePlayer/:playerId', (req, res) => {
    const playerId = req.params.playerId;
  
    const sql = 'DELETE FROM players WHERE player_id = ?';
    connection.query(sql, playerId, (err, result) => {
      if (err) {
        console.error('Error executing MySQL query:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
      if (result.affectedRows === 0) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }
      res.json({ success: true });
    });
  });

// Route to fetch players by multiple parameters
app.get('/playersByParameters', (req, res) => {
    const position = req.query.position;
    const teamName = req.query.team_name;
    const height = req.query.height;
    const weight = req.query.weight;
    const pointsPerGame = req.query.points_per_game;
    const assistsPerGame = req.query.assists_per_game;
    const reboundsPerGame = req.query.rebounds_per_game;

    // Construct the SQL query dynamically based on the provided parameters
    let sql = 'SELECT * FROM players WHERE 1=1';
    const values = [];

    if (position) {
        sql += ' AND position = ?';
        values.push(position);
    }
    if (teamName) {
        sql += ' AND team_name = ?';
        values.push(teamName);
    }
    if (height) {
        sql += ' AND height >= ?';
        values.push(height);
    }
    if (weight) {
        sql += ' AND weight >= ?';
        values.push(weight);
    }
    if (pointsPerGame) {
        sql += ' AND points_per_game >= ?';
        values.push(pointsPerGame);
    }
    if (assistsPerGame) {
        sql += ' AND assists_per_game >= ?';
        values.push(assistsPerGame);
    }
    if (reboundsPerGame) {
        sql += ' AND rebounds_per_game >= ?';
        values.push(reboundsPerGame);
    }

    connection.query(sql, values, (err, rows) => {
        if (err) {
            console.error('Error executing MySQL query:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        
        res.render('team_page', { rows });
        return console.log(values);
    });
});

// Start the server (default)
const PORT = process.env.PORT || 3001;
app.use(express.static('public'));
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
})