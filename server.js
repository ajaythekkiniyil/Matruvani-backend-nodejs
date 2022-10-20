/*
For PayU Test Server:
POST URL: https://test.payu.in/_payment

For PayU Production (LIVE) Server:
POST URL: https://secure.payu.in/_payment
*/
const urls = require('./const')


var express = require('express');
var session = require('express-session');
var app = express();
var bodyParser = require('body-parser');
var path = require('path');
var crypto = require('crypto');
var reqpost = require('request');
var cors = require('cors')

app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())
app.use(session({ secret: 'mcg001k', saveUninitialized: true, resave: true }));
app.use(express.static(__dirname + '/'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', __dirname);

require('dotenv').config()

// key and salt stored in env file
var key = process.env.PAYU_KEY
var salt = process.env.PAYU_SALT

app.post('/', function (req, res) {
	// creating txnid
	var ord = JSON.stringify(Math.random() * 1000);
	var i = ord.indexOf('.');
	txnid = 'ORD' + ord.substring(0, i);

	const udf5 = 'PayUBiz_NODE_JS_KIT'
	const data = req.body

	//generate hash with mandatory parameters and udf5
	var cryp = crypto.createHash('sha512');
	var text = key + '|' + txnid + '|' + data.updatedPrice + '|' + data.bookDetails.bookTitle + '|' + data.address.firstname + '|' + data.address.email + '|||||' + udf5 + '||||||' + salt;
	cryp.update(text);
	var hash = cryp.digest('hex');
	res.setHeader("Content-Type", "text/json");
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.send({ txnid, key, hash })
});

app.post('/payment-status', function (req, res) {
	
	if (req.body.status === 'success') {

		var verified = 'No';
		var txnid = req.body.txnid;
		var amount = req.body.amount;
		var productinfo = req.body.productinfo;
		var firstname = req.body.firstname;
		var email = req.body.email;
		var udf5 = req.body.udf5;
		var mihpayid = req.body.mihpayid;
		var status = req.body.status;
		var resphash = req.body.hash;
		var additionalcharges = "";

		//Calculate response hash to verify	
		var keyString = key + '|' + txnid + '|' + amount + '|' + productinfo + '|' + firstname + '|' + email + '|||||' + udf5 + '|||||';
		var keyArray = keyString.split('|');
		var reverseKeyArray = keyArray.reverse();
		var reverseKeyString = salt + '|' + status + '|' + reverseKeyArray.join('|');
		//check for presence of additionalcharges parameter in response.
		if (typeof req.body.additionalCharges !== 'undefined') {
			additionalcharges = req.body.additionalCharges;
			//hash with additionalcharges
			reverseKeyString = additionalcharges + '|' + reverseKeyString;
		}
		//Generate Hash
		var cryp = crypto.createHash('sha512');
		cryp.update(reverseKeyString);
		var calchash = cryp.digest('hex');
		// console.log('calchash' + calchash);
		var msg = 'Payment failed for Hash not verified...<br />Check Console Log for full response...';
		// Comapre status and hash. Hash verification is mandatory.
		if (calchash == resphash){
			res.redirect(urls.paymentStatusUrlSuccess)
		}
		else{
			res.redirect(urls.paymentStatusUrlFailed)
		}

	}
	else {
		res.redirect(urls.paymentStatusUrlFailed)
	}

});


const port = process.env.PORT || 3001
app.listen(port, () => console.log('server started on port:' + port));