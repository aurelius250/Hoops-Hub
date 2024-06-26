// Import 
const express = require('express');
const mysql = require('mysql2');
const axios = require('axios');
const cors = require('cors');


// Initiate express
const app = express();
app.use(express.json());
app.use(cors());

// MySQL connection
const connection = mysql.createConnection({
  port: 3306,
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'hoops_hub',
}).promise();

//Connect to MySQL 
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Get player IDs
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



// Get player stats
const fetchPlayerStats = async (playerID) => {
  try {
      const response = await axios(`https://api.balldontlie.io/v1/season_averages?season=2023&player_ids[]=${playerID}`);
      const data = await response.json();
      return data.data[0]; // Assuming only one set of stats is returned per player
  } catch (error) {
      console.error(`Error fetching stats for player ${playerID}:`, error);
      throw error;
  }
};

let page = 1;
let players = [];
const fetchAllPlayers = async () => {
  try {
    while (true) {
      const response = await axios.get(`https://www.balldontlie.io/api/v1/players?per_page=25&page=${page}`, {
        headers: {
            'Authorization': '',
        }
      });
      const data = response.data;

      // Check if data.meta exists and has the next_page property
      if (data.meta && data.meta?.next_page !== null) {
        // Concatenate the new players with the existing ones
        players = players.concat(data.data);

        // Increment the page number for the next request
        page++;
      } else {
        // If there are no more pages, log the players and exit the loop
        if (data.data) {
          players = players.concat(data.data);
        }
        console.log(players);
        break; // Exit the loop
      }
    }
  } catch (error) {
    console.error('Error fetching players:', error);
  }
};

app.get('/players', async (req, res) => {
  try {
    const players = await fetchAllPlayers();
    console.log(players); // Log the fetched players
    return players;
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Function to convert weight string to kilograms
function convertWeightToKilograms(weightString) {
  const pounds = parseInt(weightString);
  const kilograms = pounds * 0.453592; // 1 pound = 0.453592 kg
  const roundedKilograms = Math.round(kilograms);
  return roundedKilograms;
}


// Set the view engine to EJS
app.set('view engine', 'ejs');

// Fetch players by team name
app.get('/playersByTeam', (req, res) => {
    // Extract team name from the request query
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

  
  
  const fetchPlayerDataInBatch = async (startId, endId) => {
    const playerDataArray = [];
    for (let i = startId; i <= endId; i++) {
        try {
          const response = await axios.get(`https://api.balldontlie.io/v1/players/${i}`, {
            headers: {
                'Authorization': '',
            }
        });
            playerDataArray.push(response.data.data[0]); // Assuming only one set of stats is returned per player
            console.log(response.data.data[0]);
        } catch (error) {
            console.error(`Error fetching stats for player ${i}:`, error);
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Delay of 1 second (1000 milliseconds)
    }
    return playerDataArray;
  };

  // Get player stats using BALLDONTLIE API and player id 
  const fetchPlayerData = async () => {
    try {
      const response = await axios.get('https://api.balldontlie.io/v1/players/237', {
                headers: {
                    'Authorization': '',
                }
      });
      return response.data.map(player => ({
        ...player,
        full_name: `${player.first_name} ${player.last_name}`,
        weight_kg: convertWeightToKilograms(player.weight)
      }));
    } catch (error) {
      console.error('Error fetching player data:', error);
      throw error;
  };
}
  
  
  // Route to insert player data into the database
  app.post('/insertPlayer', async (req, res) => {
    try {
      // Fetch player data from the API
      console.log('Request received to insert player data');
      const players = await fetchPlayerDataInBatch(26, 50);
  
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

  // Gets team stats using API
  const fetchTeams = async () => {
    try {
      const response = await axios.get('https://api-nba-v1.p.rapidapi.com/standings', {
        params: {
          league: 'standard',
          season: '2023'
        },
        headers: {
          'x-rapidapi-host': 'api-nba-v1.p.rapidapi.com',
          'x-rapidapi-key': ''
        }
      });
  
      return response.data;
    } catch (error) {
      console.error('Error fetching teams:', error);
      throw error;
    }
  };

app.post('/insertTeams', async (req, res) => {
  try {
      // Fetch teams data from the API
      const data = await fetchTeams();

      // Organize fetched teams into eastern and western teams and sort them
      const eastTeams = [];
      const westTeams = [];

      data.response.forEach(team => {
          if (team.conference.name === "east") {
              eastTeams.push(team);
          } else if (team.conference.name === "west") {
              westTeams.push(team);
          }
      });

      // Sort eastern and western teams
      eastTeams.sort((a, b) => b.win.percentage - a.win.percentage);
      westTeams.sort((a, b) => b.win.percentage - a.win.percentage);

      // Insert teams into the MySQL database table
      const sql = `INSERT INTO teams (team_id, team_name, team_wins, team_losses, win_percentage, home_record, away_record, conference)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      // Implement your MySQL query here to insert teams into the "teams" table
      eastTeams.forEach(async (team) => {
          const homeRecord = team.win.home + "-" + team.loss.home;
          const awayRecord = team.win.away + "-" + team.loss.away;
          await connection.query(sql, [team.team.id, team.team.name, team.win.total, team.loss.total, team.win.percentage, homeRecord, awayRecord, team.conference.name]);
      });

      westTeams.forEach(async (team) => {
          const homeRecord = team.win.home + "-" + team.loss.home;
          const awayRecord = team.win.away + "-" + team.loss.away;
          await connection.query(sql, [team.team.id, team.team.name, team.win.total, team.loss.total, team.win.percentage, homeRecord, awayRecord, team.conference.name]);
      });
      // Use connection.query or your preferred method to execute the query

      console.log('Teams data inserted successfully');
      res.json({ success: true, message: 'Teams data inserted successfully' });
  } catch (error) {
      console.error('Error inserting teams data:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

const fetchPlayerStatsInBatch = async (startId, endId) => {
  const playerStatsArray = [];
  for (let i = startId; i <= endId; i++) {
      try {
          const response = await axios.get(`https://api.balldontlie.io/v1/season_averages?season=2023&player_ids[]=${i}`, {
              headers: {
                  'Authorization': '',
              }
          });
          playerStatsArray.push(response.data.data[0]); // Assuming only one set of stats is returned per player
          console.log(response.data.data[0]);
      } catch (error) {
          console.error(`Error fetching stats for player ${i}:`, error);
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // Delay of 1 second (1000 milliseconds)
  }
  return playerStatsArray;
};

// Route to delete player by ID
app.delete('/deletePlayer/:playerId', (req, res) => {
  const playerId = req.params.playerId;

  // Perform SQL query to delete player based on ID
  const sql = `DELETE FROM players WHERE player_id = ?`;

  connection.query(sql, playerId, (err, result) => {
    if (err) {
      console.error('Error deleting player:', err);
      return res.status(500).json({ error: 'Error deleting player', details: err.message });
    }
    console.log('Player deleted successfully');
    res.json({ success: true, message: 'Player deleted successfully' });
  });
});

app.post('/insertPlayerAverages', async (req, res) => {
  try {
      // Fetch player averages from the API
      const playerAverages = await fetchPlayerStatsInBatch(1, 25); // Assuming you want players from 1 to 25

      if (!playerAverages || playerAverages.length === 0) {
          throw new Error('No player averages fetched or empty array.');
      }

      // MySQL query to insert player data into BasketballDatabase table
      const sql = 'UPDATE players SET points_per_game = ?, assists_per_game = ?, rebounds_per_game = ?, three_perc = ?, fg_perc = ? WHERE player_id = ?';

      // Iterate over each player average and insert data into the database
      for (const average of playerAverages) {
          if (average && average.pts !== undefined && average.ast !== undefined && average.reb !== undefined && average.fg3_pct !== undefined && average.fg_pct !== undefined && average.player_id !== undefined) {
              await connection.query(sql, [average.pts, average.ast, average.reb, average.fg3_pct, average.fg_pct, average.player_id]);
          } else {
              console.error('Invalid player average data:', average);
          }
      }

      console.log('Player data inserted successfully');
      res.json({ success: true, message: 'Player data inserted successfully' });
  } catch (error) {
      console.error('Error inserting player data:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});


app.get('/teamsInfo', async (req, res) => {
  const teamName = req.query.team_name;
  const teamWins = req.query.team_wins;
  const teamLosses = req.query.team_losses;
  const winPercentage = req.query.win_percentage;
  const homeRecord = req.query.home_record;
  const awayRecord = req.query.away_record;

  // Construct the SQL query dynamically based on the provided parameters
  let sql = 'SELECT * FROM teams WHERE 1=1';
  const values = [];

  if (teamName) {
      sql += ' AND team_name = ?';
      values.push(teamName);
  }
  if (teamWins) {
      sql += ' AND team_wins = ?';
      values.push(teamWins);
  }
  if (teamLosses) {
      sql += ' AND team_losses = ?';
      values.push(teamLosses);
  }
  if (winPercentage) {
      sql += ' AND win_percentage >= ?';
      values.push(winPercentage);
  }
  if (homeRecord) {
      sql += ' AND home_record >= ?';
      values.push(homeRecord);
  }
  if (awayRecord) {
      sql += ' AND away_record >= ?';
      values.push(awayRecord);
  }

  try {
      // Query the database to get the Eastern conference teams
      const [eastTeams] = await connection.execute('SELECT * FROM teams WHERE conference = "east" ORDER BY win_percentage DESC');

      // Query the database to get the Western conference teams
      const [westTeams] = await connection.execute('SELECT * FROM teams WHERE conference = "west" ORDER BY win_percentage DESC');

      // Render the team standings page and pass the retrieved teams data
      res.render('team_standings', { eastTeams, westTeams });
  } catch (error) {
      console.error('Error fetching teams:', error);
      res.status(500).send('Internal Server Error');
  }
});

// Route to fetch players by multiple parameters
app.get('/searchPlayer', async (req, res) => {
  const playerName = req.query.playerName;
  const teamName = req.query.teamName;

  // Construct the SQL query dynamically based on the provided parameters
  let sql = 'SELECT * FROM players WHERE 1=1';
  const values = [];

  if (playerName) {
      sql += ' AND full_name = ?';
      values.push(playerName);
  }
  if (teamName) {
      sql += ' AND team_name = ?';
      values.push(teamName);
  }

  try {
      // Execute the SQL query
      const [rows] = await connection.execute(sql, values);

      // Render the player page and pass the retrieved player data
      res.render('player_page', { rows });
  } catch (error) {
      console.error('Error fetching player data:', error);
      res.status(500).send('Internal Server Error');
  }
});

app.post('/insertPlayerByUser', (req, res) => {
  const playerData = req.body;

  // Extracting data from the request body
  const player_id = playerData.player_id;
  const full_name = playerData.full_name;
  const position = playerData.position;
  const team_name = playerData.team_name;
  const height = playerData.height;
  const weight = playerData.weight;
  const points_per_game = playerData.points_per_game;
  const assists_per_game = playerData.assists_per_game;
  const rebounds_per_game = playerData.rebounds_per_game;
  const three_perc = playerData.three_perc;
  const fg_perc = playerData.fg_perc;

  // SQL query to insert player data into the database
  const sql = `INSERT INTO players (player_id, full_name, position, team_name, height, weight, points_per_game, assists_per_game, rebounds_per_game, three_perc, fg_perc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  // Executing the SQL query with individual variables
  connection.query(sql, [player_id, full_name, position, team_name, height, weight, points_per_game, assists_per_game, rebounds_per_game, three_perc, fg_perc], (err, result) => {
      if (err) {
          console.error('Error inserting player data:', err);
          return res.status(500).json({ error: 'Error inserting player data', details: err.message });
      }
      console.log('Player data inserted successfully');
      res.json({ success: true, message: 'Player data inserted successfully' });
  });
});
// Start the server (default)
const PORT = process.env.PORT || 3002;
app.use(express.static('public'));
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
})