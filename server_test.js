'use strict';

const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');

// Env Variables

const PORT = process.env.PORT || 3000;
require('dotenv').config();

// Application

const app = express();
app.use(cors());


// Postgres
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();

client.on('error', err => console.error(err));

app.get('/location', (req, res) => {
  let query = req.query.data;
  // check our DB for data

  const SQL = 'SELECT * FROM locations WHERE search_query=$1';
  const values = [query];
  return client.query(SQL, values)

    .then(data => { // then if we have it send it back
      if(data.rowCount){
        console.log('Location retrieved from Database');
        console.log(data);
        res.status(200).send(data.rows[0]);
      }else { // otherwise get it from google

        const URL = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GOOGLE_MAPS_API}`;

        return superagent.get(URL)
          .then(result => {
            console.log('Location retrived from Google');
            // then normalize it

            let location = new Location(result.body.results[0]);
            let SQL = `INSERT INTO locations
            (search_query, formatted_query, latitude, longitude)
            VALUES($1, $2, $3, $4)`;

            // store it in our DB
            return client.query(SQL, [query, location.formatted_query, location.latitude, location.longitude])
              .then(() => {
              // then send it back
                res.status(200).send(location);
              });
          });
      }
    })
    .catch(err => {
      console.error(err);
      res.send(err)
    })
});
