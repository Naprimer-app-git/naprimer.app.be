const jwt = require('jsonwebtoken');
const config = require("../../config");


class Token {
  constructor() {
    this.access_token = "";
    this.id_token = "";
    this.refresh_token = "";
    this.expiry = (60 * 60 * 24 * 365);
    this.scope = "";
    this.token_type = "";
    this.user_id = "";
  }

  create(user) {

    this.user_id = user.id;

    const options = {
      iss: config.CLIENT_ISSUER,
      sub: config.CLIENT_ID,
      aud: user.id,
      exp: Math.floor(Date.now() / 1000) + this.expiry
    };

    this.access_token = jwt.sign({
        roles: [
          "default"
        ],
        email: user.email,
        ...options
      },
      config.CLIENT_SECRET);

    this.id_token = jwt.sign(
      {
        email: user.email,
        phone_number: user.phoneNumber,
        nickname: user.nickname,
        given_name: user.givenName,
        family_name: user.familyName,
        gender: user.gender,
        avatar: user.avatar,
        ...options
      },
      config.CLIENT_SECRET
    );

    this.refresh_token = jwt.sign({}, config.CLIENT_SECRET);
    return this.access_token;
  }

  toResponse(user) {
    return {
      "access_token": this.access_token,
      "expiry": this.expiry,
      "id_token": this.id_token,
      "refresh_token": this.refresh_token,
      "scope": this.scope,
      "token_type": this.token_type,
      "user_id": user.id,
      "user": user
    }
  }

}

module.exports = Token;
