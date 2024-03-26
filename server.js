/*
CSC3916 HW4
File: Server.js
Description: Web API scaffolding for Movie API
 */

var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authController = require('./auth');
var authJwtController = require('./auth_jwt');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var User = require('./Users');
var Movie = require('./Movies');
var Review = require('./Reviews');
const Reviews = require('./Reviews');

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();

function getJSONObjectForMovieRequirement(req) {
    var json = {
        headers: "No headers",
        key: process.env.UNIQUE_KEY,
        body: "No body"
    };

    if (req.body != null) {
        json.body = req.body;
    }

    if (req.headers != null) {
        json.headers = req.headers;
    }

    return json;
}

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, msg: 'Please include both username and password to signup.'})
    } else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;

        user.save(function(err){
            if (err) {
                if (err.code == 11000)
                    return res.json({ success: false, message: 'A user with that username already exists.'});
                else
                    return res.json(err);
            }

            res.json({success: true, msg: 'Successfully created new user.'})
        });
    }
});

router.post('/signin', function (req, res) {
    var userNew = new User();
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
        if (err) {
            res.send(err);
        }

        user.comparePassword(userNew.password, function(isMatch) {
            if (isMatch) {
                var userToken = { id: user.id, username: user.username };
                var token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json ({success: true, token: 'JWT ' + token});
            }
            else {
                res.status(401).send({success: false, msg: 'Authentication failed.'});
            }
        })
    })
});

/******************************************************** */
/*                          MOVIES                        */
/******************************************************** */
router.route('/movies')
    .get(authJwtController.isAuthenticated,(req, res) => {
        // GET Movie based on query. If no query is specified, return all movies
        console.log("GET MOVIE request received.");
        Movie.find(req.query, function(err,movie){
            res.json(movie);
        });

    })
    .post(authJwtController.isAuthenticated,(req, res) => {
        // Save movie
        console.log("POST MOVIE request received.");
        if (!req.body.title) {
            console.log("Process failed: Missing movie title")
            res.json({success: false, msg: 'Please include movie title to save movie.'})
        } else {
            var movie = new Movie();
            movie.title = req.body.title;
            movie.releaseDate = req.body.releaseDate;
            movie.genre = req.body.genre;
            movie.actors = req.body.actors;
    
            movie.save(function(err){
                if (err) {
                    console.log("Failed to save movie");
                    return res.json(err);
                }
                console.log("Saved movie.");
                res.json({success: true, msg: 'Successfully created new movie.'})
            });
        }
    })
    .put(authJwtController.isAuthenticated,(req,res) => {
        //update specific movie based on query, fail without query
        console.log("PUT MOVIE request recieved.");
        if(!req.query._id)
        {
            console.log("PUT failed: Missing movie specification.");
            res.json({success: false, msg: "Please specify a movie to update."});
        } else {
            var movie = {
                title : req.body.title,
                releaseDate : req.body.releaseDate,
                genre : req.body.genre,
                actors : req.body.actors,
            };
            Movie.updateOne(req.query, movie, function(err){
                if (err) {
                    console.log("Failed to update movie.");
                    return res.json(err);
                }
                console.log("Updated movie.");
                res.json({success: true, msg: 'Successfully updated movie.'})
            });
        }
    })
    .delete(authJwtController.isAuthenticated,(req,res) => {
        //delete movie based on query, fail without query
        console.log("DELETE MOVIE request recieved.");
        if(!req.query._id)
        {
            console.log("DELETE failed: Missing movie specification.");
            res.json({success: false, msg: "Please specify a movie to delete."});
        } else {
            Movie.deleteOne(req.query, function(err){
                if (err) {
                    console.log("Failed to delete movie.");
                    return res.json(err);
                }
                console.log("Movie deleted.");
                res.json({success: true, msg: 'Successfully deleted movie.'})
            });
        }
    })
    .all((req, res) => {
        // Any other HTTP Method
        // Returns a message stating that the HTTP method is unsupported.
        res.status(405).send({ message: 'HTTP method not supported.' });
    });


router.route('/movies/:id')
    .get((req,res)=>{
        //Return movie based on id 
        console.log("GET MOVIE request received.");
        const { id } = req.params;
        var dict = [];

        Movie.findOne( { _id : id } ).then(movie => {
            //res.json(movie);
            if(!movie){
                console.log("Movie not found.");
                res.status(400).json({success: false, msg: 'Movie not in DB'});
                return;
            }
            dict.push({
                key: 'movie',
                value: movie
            });
            return dict;
        }).then(result => {
            //if req.query.reviews==true, include reviews with movie in response
            if (!result){
                return;
            } else if(req.query.reviews){          
                Reviews.find( { movieId : id }).then(reviews => {
                    dict.push({
                        key: 'reviews',
                        value: reviews
                    });
                }).then(result => {
                    res.json(dict);
                });;
            } else {
                res.json(dict);
            }   
        });
    })
    .put(authJwtController.isAuthenticated,(req, res) => {
        //Update movie in the db
        console.log("PUT MOVIE request recieved.");
        const { id } = req.params;
        
        var movie = {
            title : req.body.title,
            releaseDate : req.body.releaseDate,
            genre : req.body.genre,
            actors : req.body.actors,
        };
        Movie.updateOne( { _id : id }, movie, function(err){
            if (err) {
                console.log("Failed to update movie.");
                return res.json(err);
            }
            console.log("Updated movie.");
            res.json({success: true, msg: 'Successfully updated movie.'})
        });
        
    })
    .delete(authJwtController.isAuthenticated,(req, res) => {
        //Remove movie from db
        const { id } = req.params;

        Movie.deleteOne( { _id: id } , function(err){
            if (err) {
                console.log("Failed to delete movie.");
                return res.json(err);
            }
            console.log("Movie deleted.");
            res.json({success: true, msg: 'Successfully deleted movie.'})
        });
    })
    .all((req,res)=> {
        // Any other HTTP Method
        // Returns a message stating that the HTTP method is unsupported.
        res.status(405).send({ message: 'HTTP method not supported.' });
    });
/******************************************************** */

/**********************************************************/ 
/*                         REVIEWS                        */
/**********************************************************/

router.route('/reviews')
    .get((req,res)=>{
        //Return reviews based on query, if no query return all reviews
        console.log("GET MOVIE REVIEWS request received.");
        Reviews.find(req.query, function(err,movie){
            if(err){
                console.log("Failed to return reviews.");
                res.status(500).json({ 'message': 'Failed to get reviews' });
            } else {
                console.log("Returned reviews successfully.");
                res.json(movie);
            }
        });
    })
    .post(authJwtController.isAuthenticated,(req, res) => {
        //Add new review to db
        console.log("POST REVIEW request received.");
        if (!req.body.movieId) {
            console.log("Process failed: Missing movie ID")
            res.status(400).json({success: false, msg: 'Please include movie ID to save review.'})
        } else {
            Movie.findOne( { _id : req.body.movieId } , function (err, result) {
                if(err){
                    console.log("POST REVIEW failed.");
                    res.status(400).json({success: false, msg: 'Post review failed.'});
                } else if (!result) {
                    console.log("Movie not found, POST failed.");
                    res.status(400).json({success: false, msg: 'Post failed: Movie not found.'});
                } else {
                    var review = new Review();
                    review.movieId = req.body.movieId;
                    review.username = req.body.username;
                    review.review = req.body.review;
                    review.rating = req.body.rating;
    
                    review.save(function(err){
                        if (err) {
                            console.log("Failed to save review");
                            return res.status(500).json(err);
                        }
                        console.log("Saved review.");
                        res.json({success: true, msg: 'Successfully created new review.'})
                    });
                }
            });
        }  
    })
    .delete(authJwtController.isAuthenticated,(req, res) => {
        //Remove review from db
        console.log("DELETE REVIEW request recieved.");
        if(!req.query._id)
        {
            console.log("DELETE failed: Missing review specification.");
            res.status(400).json({success: false, msg: "Please specify a review to delete."});
        } else {
            Review.deleteOne(req.query, function(err){
                if (err) {
                    console.log("Failed to delete review.");
                    return res.status(500).json(err);
                }
                console.log("Review deleted.");
                res.json({success: true, msg: 'Successfully deleted review.'})
            });
        }
    })
    .all((req,res)=> {
        // Any other HTTP Method
        // Returns a message stating that the HTTP method is unsupported.
        res.status(405).send({ message: 'HTTP method not supported.' });
    });

/**********************************************************/

app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only


