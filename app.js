// Import required modules
const express = require('express');
const mysql = require('mysql2');
const axios = require('axios');

// Create an instance of Express
const app = express();
app.use(express.json());

// MySQL connection configuration
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '***REMOVED***',
  database: 'hoops_hub'
});


getPlayerStats = (playerId) => {
  axios.get(`https://www.balldontlie.io/api/v1/season_averages?season=2006&player_ids[]=${playerId}`)
  .then(async res => {
    console.log(res.data.data)
    this.setState({ playerStats: res.data.data[0]})
  }).catch(err => {
    console.log(err)
  })
}


getPlayerId = () => {
  
}

function convertHeightToCentimeters(heightString) {
  const [feet, inches] = heightString.split("'").map(part => parseInt(part));
  const totalInches = feet * 12 + inches;
  const totalCentimeters = totalInches * 2.54; // 1 inch = 2.54 cm
  return totalCentimeters;
}

// Function to convert weight string to kilograms
function convertWeightToKilograms(weightString) {
  const pounds = parseInt(weightString);
  const kilograms = pounds * 0.453592; // 1 pound = 0.453592 kg
  return kilograms;
}

// Connect to MySQL database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

app.get('/', (req, res) => {
  console.log('Received request for / route');
  res.send('Hello, world!');
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

  const fetchPlayerData = async () => {
    try {
      const response = await axios.get('https://www.balldontlie.io/api/v1/players');
      return response.data.data.map(player => ({
        ...player,
        full_name: `${player.first_name} ${player.last_name}`,
        height_cm: convertHeightToCentimeters(player.height),
        weight_kg: convertWeightToKilograms(player.weight)
      }));
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
      const players = await fetchPlayerData();
  
      // Extract form data from request body
      const {team_name, position} = req.body;
  
      // MySQL query to insert player data into BasketballDatabase table
      const sql = 'INSERT INTO BasketballDatabase (player_id, full_name, team_name, position, height, weight) VALUES (?, ?, ?, ?, ?, ?)';
  
      // Execute the query for each player
      players.forEach(async (player) => {
        await connection.query(sql, [player.id, player.full_name, team_name, position, player.height_cm, player.weight_kg]);
      });
  
      console.log('Player data inserted successfully');
      res.json({ success: true, message: 'Player data inserted successfully' });
    } catch (error) {
      console.error('Error inserting player data:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  });

  const fetchPlayerAverages = async () => {
    try {
      const response = await axios.get('https://api.balldontlie.io/v1/season_averages');
      return response.data.data; // Assuming the data property contains the array of player averages
    } catch (error) {
      console.error('Error fetching player averages:', error);
      throw error;
    }
  };

  app.post('/insertPlayerAverages', async (req, res) => {
    try {
      // Fetch player averages from the API
      const playerAverages = await fetchPlayerAverages();

      // MySQL query to insert player data into BasketballDatabase table
      const sql = 'INSERT INTO BasketballDatabase (points_per_game, assists_per_game, rebounds_per_game, three_perc, two_perc) VALUES (?, ?, ?, ?, ?)';
  
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
  
    const sql = 'DELETE FROM BasketballDatabase WHERE player_id = ?';
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
    let sql = 'SELECT * FROM BasketballDatabase WHERE 1=1';
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
    });
});

// Start the server (default)
const PORT = process.env.PORT || 3000;
app.use(express.static('public'));
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
})