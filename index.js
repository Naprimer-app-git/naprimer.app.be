const Model = require('./src/model');
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerApiDocument = require('./docs/api.json');
const pjson = require('./package.json');

const app = express();
const port = 3000;
const model = new Model(app);

var options = {
  swaggerOptions: {
    defaultModelsExpandDepth: -1,
    defaultModelExpandDepth: -1
  }
};

app.use(cors());
app.use(express.json());// for parsing application/json
app.use(express.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded

app.use('/api-docs', swaggerUi.serveFiles(swaggerApiDocument, options), swaggerUi.setup(swaggerApiDocument));

// AUTH
app.post('/v1/oauth/token', model.getToken.bind(model));
app.post('/v1/signup', model.signup.bind(model));


// API

//"Get feed"
app.get('/v1/feed', model.getFeed.bind(model));

//"Get user's and its profile information"
app.get('/v1/profiles/:id', model.getProfile.bind(model));

//"Change user's name, gender, avatar, etc."
app.patch('/v1/profiles/:id', model.updateProfile.bind(model));

//"Get the list of videos liked by the user."
app.get('/v1/profiles/:id/reactions', model.getUserReactions.bind(model));

//"Get the list of videos created by the user."
app.get('/v1/profiles/:id/videos', model.getUserVideos.bind(model));

//"Get the list of videos with match in the title."
app.get('/v1/search', model.search.bind(model));

//"Create new video, get URL to upload video file"
app.post('/v1/videos', model.createNewVideo.bind(model));

//"Get video meta, thumbnail, stream URLs."
app.get('/v1/videos/:id', model.getVideoById.bind(model));

//"Update video title, description, etc."
app.patch('/v1/videos/:id', model.updateVideoInfo.bind(model));

//"Set like to video"
app.post('/v1/videos/:id/reactions/likes', model.likeVideo.bind(model));

//"Unlike"
app.delete('/v1/videos/:id/reactions/likes', model.dislikeVideo.bind(model));

//"Delete video altogether"
app.delete('/v1/videos/:id', model.deleteVideo.bind(model));

//Increment views counter
app.post('/v1/videos/:id/views', model.incrementView.bind(model));

//Service or debug routing
app.get('/v1/ugc/status', model.checkUGCStatus.bind(model));
app.get('/v1/ugc/asset/:id', model.getUGCAssetInfo.bind(model));
app.get('/management/ping', (req, res) => {
  res.send(`{"version: ${pjson.version}"}`);
});

app.listen(port, () => {
  console.log(`Naprimer backend listening at http://localhost:${port}`)
});

