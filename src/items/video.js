class Video {
  constructor(data) {
    this.id = data.id;
    this.authorId = data.authorId;
    this.authorAvatar = data.authorAvatar;
    this.authorNickname = data.authorNickname;
    this.authorName = data.authorName;
    this.access = data.access || "private";
    this.title = data.title || "";
    this.description = data.description || "";
    this.stream = data.stream || "";
    this.imagePreview = data.imagePreview || "";
    this.animatedPreview = data.animatedPreview || "";
    this.animatedPreview = data.animatedPreview || "";
    this.createdAt = data.createdAt || new Date().toISOString();
    this.modifiedAt = data.modifiedAt || null;
    this.releasedAt = data.releasedAt || null;
    this.accessUpdatedAt = data.accessUpdatedAt || null;
    this.userReactions = data.userReactions || [];
    this.viewsCount = data.viewsCount || 0;
    this.likesCount = data.likesCount || 0;
    this.commentsCount = data.commentsCount || 0;
    this.uploadState = data.uploadState;
    this.uploadUrl = data.uploadUrl || "";
    this.uploadError = null;
  }

  updateByUGCData(data) {
    if(data['encode_status'] === "Task completed") {
      this.uploadState = "finished";
      this.access = "public";
      this.stream = data.streaming_links.hls.replace('http', 'https');
      this.imagePreview = data.preview;
      this.modifiedAt = new Date().toISOString();
    }
  };

  update(isPublic, title = this.title, description = this.description) {
    this.title = title;
    this.description = description;

    this.modifiedAt = new Date().toISOString();
    this.changeAccess(isPublic);
  }

  changeAccess(isPublic) {
    const currentStatusIsPublic = this.access === "public";
    /*if(currentStatusIsPublic !== isPublic) {
      this.access = isPublic ? "public" : "private";
      if(isPublic) {
        this.releasedAt = new Date().toISOString();
      }
    }*/
  }

  copy() {
    const data = {};
    data.id = this.id;
    data.authorId = this.authorId;
    data.authorAvatar = this.authorAvatar;
    data.authorNickname = this.authorNickname;
    data.authorName = this.authorName;
    data.access = this.access;
    data.title = this.title;
    data.description = this.description;
    data.stream = this.stream;
    data.imagePreview = this.imagePreview;
    data.animatedPreview = this.animatedPreview;
    data.animatedPreview = this.animatedPreview;
    data.createdAt = this.createdAt;
    data.modifiedAt = this.modifiedAt;
    data.releasedAt = this.releasedAt;
    data.accessUpdatedAt = this.accessUpdatedAt;
    data.userReactions = this.userReactions;
    data.viewsCount = this.viewsCount;
    data.likesCount = this.likesCount;
    data.commentsCount = this.commentsCount;
    data.uploadState = this.uploadState;
    data.uploadUrl = this.uploadUrl;
    data.uploadError = null;

    return data;
  }

  copyToResponse(addUpload = false) {
    const data = {
      "id": this.id,
      "author_id": this.authorId,
      "author_avatar": this.authorAvatar,
      "author_nickname": this.authorNickname,
      "author_name": this.authorName,
      "access": this.access,
      "upload_state": this.uploadState,
      "title": this.title,
      "description": this.description,
      "stream": this.stream,
      "image_preview": this.imagePreview,
      "animated_preview": this.animatedPreview,
      "created_at": this.createdAt,
      "modified_at": this.modifiedAt || "0001-01-01T00:00:00Z",
      "released_at": this.releasedAt || "0001-01-01T00:00:00Z",
      "access_upd_at": this.accessUpdatedAt || "0001-01-01T00:00:00Z",
      "user_reactions": this.userReactions || [],
      "interactions": {
        "views_count": this.viewsCount,
        "likes_count": this.likesCount
      },
      "comments_count": this.commentsCount
    };

    if (addUpload) {
      data.upload = {
        "error": this.uploadError,
        "state": this.uploadState,
        "url": this.uploadUrl
      }
    }

    return data;
  }

}

module.exports = Video;
