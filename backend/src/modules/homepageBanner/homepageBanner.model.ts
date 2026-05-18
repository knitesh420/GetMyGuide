import mongoose from "mongoose";

const homepageBannerSchema = new mongoose.Schema(
  {
    videos: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "HomepageBanner",
  homepageBannerSchema
);