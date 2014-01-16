var mongo = require('mongodb'),
 fs = require ('fs')
 
var Server = mongo.Server,
    Db = mongo.Db,
    BSON = mongo.BSONPure;

var filename = "./config.json",
config = JSON.parse (fs.readFileSync(filename,'utf8'));

var myDB = null;

mongo.Db.connect(config.mongodb.url, function (err, db) {
    if (!err) {
        console.log("Connected to 'tweetDb' database");
        db.collection('tweets', { strict: true }, function (err, collection) {
            if (err) {
                console.log("The 'tweets' collection doesn't exist. Creating it with sample data...");
            }
            myDB = db;
        });
    }
});

exports.findAll = function(req, res) {
    myDB.collection('tweets', function(err, collection) {
        collection.find().sort( { timestamp: -1 } ).toArray(function(err, items) {
            res.send(items);
        });
    });
};
exports.findById = function(req, res) {
    var id = req.params.id;
    console.log('Retrieving tweet: ' + id);
    myDB.collection('tweets', function(err, collection) {
        collection.findOne({'_id':new BSON.ObjectID(id)}, function(err, item) {
            res.send(item);
        });
    });
};
