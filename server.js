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


// Get API Data

app.get('/location', getLocation);
app.get('/weather', getWeather);
app.get('/yelp', getYelp);
app.get('/movies', getMovies);

// handlers

function getLocation(req, res){
  let lookupHandler = {
    cacheHit : (data) => {
      console.log('Location retrieved from database')
      res.status(200).send(data.rows[0]);
    },
    cacheMiss : (query) => {
      return searchForLocation(query)
      .then(result => {
        res.send(result);
      })
    }
  }
  lookupLocation(req.query.data, lookupHandler);

  // return searchForLocation(request.query.data) // 'Lynnwood, WA'
  //   .then(locationData => {
  //     response.send(locationData);
  //   })
}

// Database Lookup
function lookupLocation(query, handler) {
  const SQL = 'SELECT * FROM locations WHERE search_query=$1';
  const values = [query];
  return client.query(SQL, values)
    .then(data => {
      if (data.rowCount) {
        handler.cacheHit(data);
      }else{
        handler.cacheMiss(query);
      }
    })
}

function getWeather (req, res){
  return searchForWeather(req.query.data)
    .then(weatherData => {
      res.send(weatherData);
    })
}

function getYelp(req, res){
  return searchForYelp(req.query.data)
    .then(searchForYelpData => {
      res.send(searchForYelpData);
    })
}

function getMovies(req, res){
  return searchMovies(req.query.data)
    .then(moviesData => {
      res.send(moviesData);
    })
}
// Constructors

function Location(location){
  this.formatted_query = location.formatted_address;
  this.latitude = location.geometry.location.lat;
  this.longitude = location.geometry.location.lng;
  this.short_name = location.address_components[0].short_name;;
}

function Daily(dayForecast){
  this.forecast = dayForecast.summary;
  this.time = new Date(dayForecast.time * 1000).toDateString();
}

function Yelp(business) {
  this.name = business.name;
  this.image_url = business.image_url;
  this.price = business.price;
  this.rating = business.rating;
  this.url = business.url;
}

function Movies(movie){
  this.title = movie.title;
  this.overview = movie.overview;
  this.average_votes = movie.vote_average;
  this.total_votes = movie.vote_count;
  this.image_url = 'https://image.tmdb.org/t/p/w200_and_h300_bestv2/' + movie.poster_path;
  this.popularity = movie.popularity;
  this.released_on = movie.release_date;
}

// Search for Resource

function searchForLocation(query){
  const mapUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GOOGLE_MAPS_API}`;
  return superagent.get(mapUrl)
    .then(geoData => {
      console.log('Location retrieved from Google')
      let location = new Location(geoData.body.results[0]);
      let SQL = `INSERT INTO locations
            (search_query, formatted_query, latitude, longitude)
            VALUES($1, $2, $3, $4)`;

      return client.query(SQL, [query, location.formatted_query, location.latitude, location.longitude])
        .then(() => {
          return location;
        })
    })
    .catch(err => console.error(err));
}

function searchForWeather(query){
  // console.log(query)
  const weatherUrl = `https://api.darksky.net/forecast/${process.env.DARK_SKY_API}/${query.latitude},${query.longitude}`;
  return superagent.get(weatherUrl)
    .then(weatherData => {
      let dailyWeatherArray = weatherData.body.daily.data.map(forecast => new Daily(forecast));
      return dailyWeatherArray;
    })
    .catch(err => console.error(err));
}

function searchForYelp(query){
  const yelpUrl = `https://api.yelp.com/v3/businesses/search?term=restaurants&latitude=${query.latitude}&longitude=${query.longitude}`;
  return superagent.get(yelpUrl)
    .set('Authorization', `Bearer ${process.env.YELP_API}`)
    .then(searchForYelpData => {
      return searchForYelpData.body.businesses.map(business => new Yelp(business))
    })
    .catch(err => console.error(err));
}

function searchMovies(query){
  const moviesUrl = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.MOVIES_DB_API}&query=${query.short_name}`;
  return superagent.get(moviesUrl)
    .then(searchMoviesData => {
      return searchMoviesData.body.results.map(movie => new Movies(movie))
    })
    .catch(err => console.error(err));
}

// Error messages
app.get('/*', function(req, res){
  res.status(404).send('you are in the wrong place');
})

app.listen(PORT, () => {
  console.log(`app is running on port: ${PORT}`);
})
