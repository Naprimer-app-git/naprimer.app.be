const {uuid} = require('uuidv4');
var randomHexColor = require('random-hex-color');
const config = require("../../config");

class User {
  constructor(data) {
    {
      //console.log(data);
      this.client_id = config.CLIENT_ID;
      this.id = data.id || uuid();
      this.email = data.email || "";
      this.name = data.name || "";
      this.password = data.password || ""; //md5(password);
      this.avatar = data.avatar || `https://eu.ui-avatars.com/api/?name=${this.name}`;
      this.background = data.background || {
        type: "color",
        value: randomHexColor()
      };
      this.birthDate = new Date(data.birthDate || "0001-01-01T00:00:00Z");
      this.familyName = data.familyName || "";
      this.gender = data.gender || "";
      this.givenName = data.givenName || "";
      this.nickname = data.nickname || "";
      this.phoneNumber = data.phoneNumber || "";
      this.about = data.about || "";
      this.likesCount = data.likesCount || 0;
      this.followersCount = data.followersCount || 0;
      this.followingCount = data.followingCount || 0;
      this.followed = data.followed || null;

      //console.log(this.copy());
    }
  }

  updateInfo(name, nickname, about) {
    this.name = name || this.name;
    this.nickname = nickname || this.nickname;
    this.about = about || this.about;
  }

  copy(safe = true) {

    const user = {
      id: this.id,
      email: this.email,
      phoneNumber: this.phoneNumber,
      nickname: this.nickname,
      name: this.name,
      birthDate: this.birthDate.toISOString(),
      gender: this.gender,
      about: this.about,
      avatar: this.avatar,
      background: this.background,
      followersCount: this.followersCount,
      followingCount: this.followingCount,
      likesCount: this.likesCount
    };

    if (this.followed) user.followed = this.followed;
    if (!safe) user.password = this.password;
    return user;
  }

  copyFromToken() {
    const user = {
      "id": this.id,
      "avatar": this.avatar,
      "birth_date": this.birthDate.toISOString(),
      "client_id": this.client_id,
      "email": this.email,
      "family_name": this.familyName,
      "gender": this.gender,
      "given_name": this.givenName,
      "name": this.name,
      "nickname": this.nickname,
      "phone_number": this.phoneNumber
    };
    return user;
  }
}

module.exports = User;
