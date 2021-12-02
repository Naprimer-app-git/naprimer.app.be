const Duplex = require('stream').Duplex;

const Datastore = require('nedb');
const md5 = require('md5');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const config = require("../config");

const User = require('./items/user');
const Video = require('./items/video');
const Token = require('./items/token');

class Model {
    constructor(app) {
        this.app = app;
        this.db = {};


        /*this.db.users = new Datastore({filename: './database/users.db', autoload: true});
        this.db.videos = new Datastore({filename: './database/videos.db', autoload: true});
        this.db.reactions = new Datastore({filename: './database/reactions.db', autoload: true});*/

        this.db.users = new Datastore({inMemoryOnly: true, autoload: true});
        this.db.videos = new Datastore({inMemoryOnly: true, autoload: true});
        this.db.reactions = new Datastore({inMemoryOnly: true, autoload: true});
    }

    //AUTH
    getToken(req, res) {
        const email = req.body.username || null;
        const password = req.body.password || null;

        console.log(`getToken: get token from ${email}`);

        if (!email || !password) {
            res.status(400);
            res.json({message: "email or password can not be null"});
            return;
        }

        try {
            this.db.users.findOne({email: email}, (err, doc) => {
                if (err || !doc) {
                    console.log(`getToken: user not found`);
                    res.status(404);
                    res.json({message: "user not found"});
                    return;
                }

                if (doc.password !== md5(password)) {
                    res.status(400);
                    console.log(`getToken: email or password is wrong`);
                    return res.json({message: "email or password is wrong"});
                }

                const user = new User(doc);
                const token = new Token();
                token.create(user);

                console.log(`getToken: token created`);
                const response = token.toResponse(user.copyFromToken());
                res.json(response);
            });

        } catch (e) {
            res.status(500);
            res.json({message: e.toString()});
        }
    }

    signup(req, res) {
        const name = req.body.name || null;
        const email = req.body.email || null;
        const password = req.body.password || null;

        console.log(`signup: Register user ${name}`);

        if (!email || !password) {
            console.log(`signup: email or password can not be null`);
            res.status(400);
            res.json({message: "email or password can not be null"});
            return;
        }

        try {
            this.db.users.find({email: email}, (err, docs) => {
                if (docs.length) {
                    console.log(`signup: user already registered`);
                    res.status(401);
                    res.json({message: "user already registered"});
                    return;
                }

                const user = new User({name: name, email: email, password: md5(password)});

                this.db.users.insert(user.copy(false), function (err, newUser) {
                    if (err) {
                        console.log(`signup: ${err.toString()}`);
                        res.status(400);
                        res.json({"message": err.toString()});
                        return;
                    }

                    const token = new Token();
                    token.create(user);

                    console.log(`signup: user ${name} created, id ${user.id}`);
                    const response = token.toResponse(user.copyFromToken());
                    res.json(response);
                });
            });
        } catch (e) {
            res.status(500);
            res.json({message: e.toString()});
        }
    }

    //API
    getFeed(req, res) {
        let results = [];
        console.log(`getFeed: get feed videos`);
        try {
            this.updateUploadStatus(() => {
                this.db.videos.find({access: "public", uploadState: "finished"}, (err, doc) => {
                    doc.forEach((info) => {
                        const video = new Video(info);
                        results.push(video.copyToResponse());
                    });

                    console.log(`getFeed: Found ${doc.length} videos`);

                    res.json({
                        results: results.reverse(),
                        limit: doc.length,
                        next: null
                    });
                });

            });
        } catch (e) {
            res.status(500);
            res.json({message: e.toString()});
        }
    }

    getProfile(req, res) {
        console.log(`getProfile: get profile for id ${req.params.id}`);
        this.db.users.findOne({id: req.params.id}, (err, doc) => {
            if (err || !doc) {
                res.status(404);

                console.log(`getProfile: user id ${req.params.id} not found`);
                res.json({message: "user not found"});
                return;
            }

            const user = new User(doc);
            res.send(user.copy());
        });
    }

    updateProfile(req, res) {
        const about = req.body.about || null;
        const nickname = req.body.nickname || null;
        const name = req.body.name || null;
        const userId = this._getUserId(req);

        console.log(`updateProfile: user id ${req.params.id}, name ${name}, nickname ${nickname}, about ${about}`);

        if (!req.params.id) {
            console.log(`updateProfile: user id is null`);
            res.status(400);
            res.json({message: "user id is null"});
            return;
        }

        if (req.params.id !== userId) {
            console.log(`updateProfile: unauthorized`);
            res.status(401);
            res.json({message: "unauthorized"});
            return;
        }

        try {
            this.db.users.findOne({id: req.params.id}, (err, doc) => {
                if (err || !doc) {
                    console.log(`updateProfile: Error ${err.toString()}`);
                    res.status(404);
                    res.json({message: "user not found"});
                    return;
                }

                const user = new User(doc);
                user.updateInfo(name, nickname, about);
                this.db.users.update({id: doc.id}, user.copy(false), {}, (err, num) => {
                    res.json(user.copy());
                });
            });
        } catch (e) {
            res.status(500);
            res.json({message: e.toString()});
        }
    }

    getVideoById(req, res) {
        console.log(`getVideoById: video id ${req.params.id}`);

        try {
            this.db.videos.findOne({id: req.params.id}, (err, doc) => {
                if (err || !doc) {
                    console.log(`getVideoById: Error ${err.toString()}`);
                    res.status(500);
                    res.json({message: err.toString()});
                    return;
                }

                const video = new Video(doc);
                console.log(`getVideoById: Found video ${video.title}`);
                res.json(video.copyToResponse());
            });
        } catch (e) {
            res.status(500);
            res.json({message: e.toString()});
        }
    }

    getUserVideos(req, res) {
        console.log(`getUserVideos: get videos from user ${req.params.id}`);

        let response = {
            limit: 0,
            next: null,
            results: []
        };

        try {
            this.db.videos.find({authorId: req.params.id, uploadState: 'finished'}, (err, doc) => {
                if (err) {
                    console.log(`getUserVideos: Error ${err.toString()}`);
                    res.status(500);
                    res.json({message: err.toString()});
                    return;
                }

                console.log(`getUserVideos: Found ${doc.length} videos`);

                doc.forEach((data) => {
                    const item = new Video(data);
                    response.results.push(item.copyToResponse());
                });

                res.json(response);
            });
        } catch (e) {
            res.status(500);
            res.json({message: e.toString()});
        }
    }

    getUserReactions(req, res) {
        const type = req.query.type || null;
        let response = {
            limit: 0,
            next: "",
            results: []
        };

        console.log(`getUserReactions: get reactions from user ${req.params.id} and type ${type}`);

        try {
            this.db.reactions.find({userId: req.params.id, type: type}, (err, doc) => {
                if (err) {
                    console.log(`getUserReactions: Error ${err.toString()}`);
                    res.status(400);
                    res.json({message: err.toString()});
                    return;
                }

                console.log(`getUserReactions: found ${doc.length} reactions`);

                if (!doc.length) {
                    res.json(response);
                    return;
                }

                let targets = [];

                doc.forEach((data) => {
                    targets.push(data.videoId);
                });

                this.db.videos.find({
                    id: {$in: targets},
                }, (err, doc) => {
                    if (err) {
                        console.log(`getUserReactions: Error ${err.toString()}`);
                        res.status(500);
                        res.json({message: err.toString()});
                        return;
                    }

                    console.log(`getUserReactions: videos found ${doc.length}`);

                    doc.forEach((data) => {
                        const item = new Video(data);
                        response.results.push(item.copyToResponse());
                    });

                    res.json(response);
                });
            });
        } catch (e) {
            res.status(500);
            res.json({message: e.toString()});
        }
    }

    incrementView(req, res) {
        console.log(`incrementView: increment counter for video ${req.params.id}`);
        try {
            this.db.videos.update({id: req.params.id}, {$inc: {viewsCount: 1}});
            res.status(204);
            res.json({message: "OK"});
        } catch (e) {
            res.status(500);
            res.json({message: e.toString()});
        }
    }

    likeVideo(req, res) {
        const userId = this._getUserId(req);

        console.log(`likeVideo: user ${userId} like video ${req.params.id}`);
        try {
            this.db.reactions.insert({type: 'likes', userId: userId, videoId: req.params.id}, (err, doc) => {
                if (err) {
                    console.log(`likeVideo: ${err.toString()}`);
                    res.status(404);
                    res.json({message: err.toString()});
                    return;
                }

                res.status(204);
                res.json({message: "OK"});

                this.db.videos.update({id: req.params.id}, {$inc: {likesCount: 1}});
            });
        } catch (e) {
            res.status(500);
            res.json({message: e.toString()});
        }
    }

    dislikeVideo(req, res) {
        const userId = this._getUserId(req);

        console.log(`dislikeVideo: user ${userId} dislike video ${req.params.id}`);

        try {
            this.db.reactions.remove({userId: userId, videoId: req.params.id}, {multi: true}, (err, numRemoved) => {
                if (err) {
                    console.log(`dislikeVideo: ${err.toString()}`);

                    res.status(404);
                    res.json({message: err.toString()});
                    return;
                }

                res.status(204);
                res.json({message: "OK"});

                this.db.videos.update({id: req.params.id}, {$inc: {likesCount: -1}});
            });
        } catch (e) {
            res.status(500);
            res.json({message: e.toString()});
        }
    }

    deleteVideo(req, res) {
        const userId = this._getUserId(req);

        console.log(`deleteVideo: user ${userId} wants to delete video ${req.params.id}`);
        try {
            this.db.videos.findOne({id: req.params.id, authorId: userId}, (err, doc) => {
                if (err) {
                    res.status(404);
                    return res.json({message: err.toString()});
                }

                this.db.videos.remove({id: req.params.id}, {}, function (err, numRemoved) {
                    fetch(config.UGC_PATH + "/assets/" + req.params.id, {
                        method: 'delete',
                        headers: {
                            'Content-Type': 'application/json',
                            'Token': config.UGC_TOKEN,
                            'User-ID': config.UGC_UUID
                        }
                    }).then(response => {
                        response.json().then(data => {
                            console.log(`deleteVideo: UGC video deleted`);
                            console.log(data)
                        });
                    })
                        .then(json => {
                            console.log(`deleteVideo: UGC video delete failed ;(`);
                            console.log(json)
                        });

                    res.status(204);
                    res.json({message: "OK"});
                });
            });
        } catch (e) {
            res.status(500);
            res.json({message: e.toString()});
        }
    };

    createNewVideo(req, res) {
        const userId = this._getUserId(req);

        console.log(`createNewVideo: create new video`);
        try {
            this.db.users.findOne({id: userId}, (err, doc) => {
                if (err || !doc) {
                    console.log(`createNewVideo: user not found`);

                    res.status(400);
                    res.json({message: "user not found"});
                    return;
                }

                const user = new User(doc);

                fetch(config.UGC_PATH + '/uploads', {
                    method: 'post',
                    headers: {
                        'Content-Type': 'application/json',
                        'Token': config.UGC_TOKEN,
                        'User-ID': config.UGC_UUID
                    }
                }).then((response) => {
                    response.json().then(json => {
                        const data = json.data;
                        const video = new Video({
                            id: data['asset_id'],
                            authorId: user.id,
                            authorAvatar: user.avatar,
                            authorNickname: user.nickname,
                            authorName: user.name,
                            access: 'private',
                            createdAt: new Date().toISOString(),
                            uploadState: "new",
                            uploadUrl: data.url
                        });
                        console.log(`createNewVideo: video ${video.id} created from user ${user.id}`);

                        this.db.videos.insert(video.copy(), (err, doc) => {
                            if (err) {
                                console.log(`createNewVideo: ${err.toString()}`);

                                res.status(500);
                                res.json({message: err.toString()});
                                return;
                            }

                            res.json(video.copyToResponse(true));
                        });

                    });
                }).catch((error) => {
                    console.log(`createNewVideo: ${err.toString()}`);
                    res.status(500);
                    return res.json({message: error.toString()});
                });

            });
        } catch (e) {
            res.status(500);
            res.json({message: e.toString()});
        }
    }

    search(req, res) {
        const text = req.query.text.toLowerCase();
        const results = [];

        console.log(`search: search videos from: ${text}`);

        try {
            this.db.videos.find({
                access: "public",
                uploadState: "finished",
            }, (err, doc) => {
                doc.forEach((info) => {
                    if (info.description.toLowerCase().indexOf(text) !== -1 ||
                        info.title.toLowerCase().indexOf(text) !== -1) {
                        const video = new Video(info);
                        results.push(video.copyToResponse());
                    }
                });

                console.log(`search: founded ${results.length} videos from: ${text}`);

                res.json({
                    results: results.reverse(),
                    limit: doc.length,
                    next: ""
                });
            });
        } catch (e) {
            res.status(500);
            res.json({message: e.toString()});
        }
    }

    updateVideoInfo(req, res) {
        const title = req.body.title || "";
        const description = req.body.description || "";
        const publishAfterUpload = Boolean(req.body['publish_after_upload']);

        console.log(`updateVideoInfo: update info from video ${req.params.id}`);
        console.log(`updateVideoInfo: new title ${title}, new description ${description}`);
        try {
            this.db.videos.findOne({id: req.params.id}, (err, doc) => {
                if (err) {
                    console.log(`updateVideoInfo: err.toString()`);

                    res.status(404);
                    res.json({message: err.toString()});
                    return;
                }

                const video = new Video(doc);
                video.update(publishAfterUpload, title, description);
                this.db.videos.update({id: doc.id}, video.copy(), (err, doc) => {
                    if (!err) {
                        console.log(`updateVideoInfo: video ${req.params.id} updated`);
                        res.json(video.copyToResponse());
                        return;
                    }

                    res.status(500);
                    return res.json({message: err.toString()});
                });
            });
        } catch (e) {
            res.status(500);
            res.json({message: e.toString()});
        }
    }

    checkUGCStatus(req, res, callback) {
        fetch(config.UGC_PATH + "/assets", {
            method: 'get',
            headers: {
                'Content-Type': 'application/json',
                'Token': config.UGC_TOKEN,
                'User-ID': config.UGC_UUID
            }
        }).then(response => {
            response.json().then(data => {
                if (res) res.send(data);
                if (callback) callback(data);
            });
        }).catch((error) => console.log(error));
    }

    getUGCAssetInfo(req, res, callback) {
        fetch(config.UGC_PATH + '/playbacks/' + req.params.id, {
            method: 'get',
            headers: {
                'Content-Type': 'application/json',
                'Token': config.UGC_TOKEN,
                'User-ID': config.UGC_UUID
            }
        }).then(response => {
            response.json().then(data => {
                if (res) res.send(data);
                if (callback) callback(data);
            });
        })
        //.then(json => console.log(json));
    }

    updateUploadStatus(callback) {
        try {
            this.checkUGCStatus(null, null, (data) => {
                const status = data.data;
                console.log(`updateUploadStatus: response contains ${status.length} elements`);
                status.forEach((item) => {
                    this.db.videos.findOne({id: item.id}, (err, doc) => {
                        if (doc) {
                            if (doc.uploadState !== "finished" && item['playback_ids'].length) {
                                this.getUGCAssetInfo({params: {id: item['playback_ids'][0].id}}, null, (info) => {
                                    // console.log(info)
                                    const video = new Video(doc);
                                    video.updateByUGCData(info);
                                    this.db.videos.update({id: doc.id}, video.copy(), (err, updated) => {

                                    });
                                });
                            }
                        }
                    });
                });
                callback();
            })
        } catch (e) {
            callback();
        }
    }

    _getUserId(req) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token == null) return null;

        const decoded = jwt.decode(token, {complete: true});
        return decoded.payload.aud;
    }


}

module.exports = Model;
