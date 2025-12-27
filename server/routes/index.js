var express = require('express');
var router = express.Router();
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({
  path: path.resolve(__dirname, `../../.env.${process.env.NODE_ENV}`)
});

router.get('/', function(req, res, next) {
  res.redirect(`https://dashboard.${process.env.GESTIONO_DOMAIN}/app/${process.env.GESTIONO_APP_ID}?appJs=http://localhost:3000/appJs`);
});

router.get('/appJs', function(req, res, next) {
  fs = require('fs');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  fs.createReadStream(path.join(__dirname, '../../dist/app-bundle.js')).pipe(res);
});

module.exports = router;
