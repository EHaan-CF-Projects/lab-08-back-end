'use strict';

const express = require('express');
const cors = require('cors');
const superagent = require('superagent');

// Env Variables

const PORT = process.env.PORT || 3000;

require('dotenv').config();

// Application

const app = express();

app.use(cors());

// Get API Data

app.get('/location', getLocation);
app.get('/weather', getWeather);
app.get('/yelp', getYelp);
app.get('/movies', getMovies);

// handlers

function getLocation(request, response){
  return searchToLatLong(request.query.data) // 'Lynnwood, WA'
    .then(locationData => {
      response.send(locationData);
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

function searchToLatLong(query){
  const mapUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GOOGLE_MAPS_API}`;
  return superagent.get(mapUrl)
    .then(geoData => {
      const location = new Location(geoData.body.results[0]);
      return location;
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
