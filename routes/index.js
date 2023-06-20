var express = require('express');


var router = express.Router();


//
// GET static home page.
router.get('/', 
  function(req, res, next) {
    res.redirect('/html/index.html');

  }
);


/* GET command module page. */

router.get('/command',
  function (req, res) {

    var relVersion = "";
    var relDate = "";

    if (req.configData.releaseVersion !== undefined) {
      relVersion = req.configData.releaseVersion;
      relDate = req.configData.releaseDate;

    } else {
      relVersion = req.configData.build.releaseVersion;
      relDate = req.configData.build.releaseDate;
    }

//    console.log('>>>> contents of req: %s', JSON.stringify(req.headers));
    var reqHeaders = req.headers;
    var reqIP = req.ip;

    res.render('command', {

      releaseVersion: relVersion,
      releaseDate: relDate,

      pageTitle: 'loopool: command',

      reqHeaders: reqHeaders,
      reqIP: reqIP,

    });
  }
);


/* GET query module page. */

router.get('/query',
  function (req, res) {

    var relVersion = "";
    var relDate = "";

    if (req.configData.releaseVersion !== undefined) {
      relVersion = req.configData.releaseVersion;
      relDate = req.configData.releaseDate;

    } else {
      relVersion = req.configData.build.releaseVersion;
      relDate = req.configData.build.releaseDate;
    }

    var reqHeaders = req.headers;
    var reqIP = req.ip;

    res.render('query', {

      releaseVersion: relVersion,
      releaseDate: relDate,

      pageTitle: 'loopool: query',

      reqHeaders: reqHeaders,
      reqIP: reqIP,


    });
  }
);



module.exports = router;
