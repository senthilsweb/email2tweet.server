var Imap = require('imap')
    ,inspect = require('util').inspect
    ,MongoClient = require('mongodb').MongoClient
    ,format = require('util').format
    ,fs = require ('fs')
    ,cheerio = require('cheerio')
    ,util = require('util')
    ,twitter = require('twitter')
    ,cronJob = require('cron').CronJob
    ,MongoClient = require('mongodb').MongoClient;

var filename = __dirname + "/config.json";
var config = JSON.parse (fs.readFileSync(filename,'utf8'));
var messages = [];//holds tweet messages

new cronJob(config.cron.schedule, function () {
    //console.log('You will see this message every minute');

    var imap = new Imap({
        user: config.username,
        password: config.password,
        host: config.imap.host,
        port: config.imap.port,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
    });

    var twit = new twitter({
        consumer_key: config.twitter.consumerKey,
        consumer_secret: config.twitter.consumerSecret,
        access_token_key: config.twitter.accessTokenKey,
        access_token_secret: config.twitter.accessTokenSecret
    });

    imap.connect();

    imap.once('ready', function () {
        openInbox(function (err, box) {
            //console.log("Total Messages = [" + box.messages.total + "]")
            if (err) throw err;
            imap.search(['UNSEEN'], function (err, results) {
                if (err) throw err;
                console.log("results count = " + results.length)
                if (results.length > 0) {
                    var f = imap.fetch(results, { bodies: 'TEXT', struct: true, 'markSeen': true });
                    f.on('message', function (msg, seqno) {
                        console.log('Message #%d', seqno);
                        var prefix = '(#' + seqno + ') ';

                        msg.on('body', function (stream, info) {
                            //imap.addFlags(msg.id, 'DELETED', function(err) { });
                            //stream.pipe(fs.createWriteStream('msg-' + seqno + '-body.txt'));
                            var buffer = '';
                            stream.on('data', function (chunk) {
                                buffer += chunk.toString('utf8');
                            });
                            stream.once('end', function () {
                                var resultString = buffer.toString('', 0, buffer.length).replace(/3D\"/gi, "\"");
                                //console.log(resultString);
                                var $ = cheerio.load(resultString);
                                var tweetString = "";
                                //BUY START
                                $('p:has(strong)').each(function (i, elem) {
                                    var txt = $(this).text();
                                    if (txt.indexOf("BUY") == 0) {
                                        //Push messages into twitter
                                        tweetString = txt.replace(/=A0/gi, " ").replace(/[\n\r]/g, '').replace(/=/gi, "");
                                        console.log("tweetString = " + tweetString);
                                        messages.push({ 'message': tweetString, 'timestamp': new Date(), 'type': (tweetString.indexOf("BUY") == 0) ? 'BUY' : 'SELL' });
                                        twit.updateStatus(tweetString, function (data) {});
                                    }
                                }); //BUY END

                                //SELL START
                                $('p.MsoNormal').each(function (i, elem) {
                                    var txt = $(this).text();
                                    if (txt.indexOf("SELL") == 0) {
                                        tweetString = txt.replace(/=/gi, "").replace(/[\n\r]/g, '')
                                        //Push messages into twitter
                                        console.log("tweetString = " + tweetString);
                                        messages.push({ 'message': tweetString, 'timestamp': new Date(), 'type': (tweetString.indexOf("BUY") == 0) ? 'BUY' : 'SELL' });                                        
                                        twit.updateStatus(tweetString, function (data) {console.log("Result Data = " + data)});
                                    }
                                }); //SELL END
                            });
                        });
                        msg.once('attributes', function (attrs) {
                            //console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
                        });
                        msg.once('end', function () {
                            //console.log(prefix + 'Finished');
                        });
                    });
                    f.once('error', function (err) { });
                    f.once('end', function () {
                        console.log('Done fetching all messages!');
                        //Add to MongoDB
                       setTimeout(function(){SaveToMongoDB();},1000);
                        //imap.end(); 
                    });
                }
            });
        }); //end of "openInbox"
    });

    imap.once('error', function (err) {
        console.log(err);
    });

    imap.once('end', function () {
        console.log('Connection ended');
    });

    function openInbox(cb) {
        //Open inbox with write option (true -> readonly)
        imap.openBox('INBOX', false, cb);
    }

    //end for cron
}, null, true, "America/Los_Angeles");


function SaveToMongoDB(tweet){
    MongoClient.connect(config.mongodb.url, function (err, db) {
        if (!err) {
            console.log("Tweets count = " + messages.length);
            console.log("Mongo Connected");
            var collection = db.collection('tweets');
            for (var i = 0; i < messages.length; i++) { 
                collection.insert(messages[i], { w: 1 }, function (err, result) {});
            }
            //console.log("Mongo Disconnected");
        } else {
            return console.dir(err);
        }
    });
}






