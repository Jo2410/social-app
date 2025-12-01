import { HydratedDocument, model, models, Schema, Types } from "mongoose";

export interface IFriendRequest {
  createdBy: Types.ObjectId;

  sendTo?:Types.ObjectId;

  createdAt?: Date;

  acceptedAt:Date;

  updatedAt?: Date;
}

export type HFriendRequestDocument = HydratedDocument<IFriendRequest>;

const friendRequestSchema = new Schema<IFriendRequest>(
  {
    sendTo:{type: Schema.Types.ObjectId, ref:"User", required: true},
    acceptedAt:Date,

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

    createdAt: Date,
    updatedAt: Date,
  },
  {
    timestamps: true,
    strictQuery: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

friendRequestSchema.pre(["findOneAndUpdate", "updateOne"], function (next) {
  const query = this.getQuery();
  if (query.paranoid === false) {
    this.setQuery({ ...query });
  } else {
    this.setQuery({ ...query, freezedAt: { $exists: false } });
  }

  next();
});

friendRequestSchema.pre(["find", "findOne"], function (next) {
  const query = this.getQuery();
  if (query.paranoid === false) {
    this.setQuery({ ...query });
  } else {
    this.setQuery({ ...query, freezedAt: { $exists: false } });
  }

  next();
});

friendRequestSchema.pre(["updateOne", "findOneAndUpdate"], function (next) {
  const query = this.getQuery();
  if (query.paranoid === false) {
    this.setQuery({ ...query });
  } else {
    this.setQuery({ ...query, freezedAt: { $exists: false } });
  }

  next();
});




export const FriendRequestModel =
  models.friendRequest || model<IFriendRequest>("FriendRequest", friendRequestSchema);
