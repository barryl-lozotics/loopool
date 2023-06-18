var express = require('express');


var router = express.Router();


//
// GET static home page.
router.get('/', 
  function(req, res, next) {
    res.redirect('/html/index.html');

  }
);


/* GET main page. */

router.get('/main',
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

    res.render('main', {

      releaseVersion: relVersion,
      releaseDate: relDate,

      pageTitle: 'loopool: main',

    });
  }
);




module.exports = router;
