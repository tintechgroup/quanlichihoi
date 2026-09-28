import mongoose, {
  Schema,
  Model,
  models,
  Types,
} from "mongoose";

export interface IChiHoi {
  maChiHoi: string;
  tenChiHoi: string;
  moTa?: string;
  // Optional status on legacy records read by reports and recipient lists.
  trangThai?: string;
  chiHoiTruongId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ChiHoiSchema = new Schema<IChiHoi>(
  {
    maChiHoi: {
      type: String,
      required: [true, "Mã Chi hội không được để trống"],
      unique: true,
      trim: true,
      uppercase: true,
    },

    tenChiHoi: {
      type: String,
      required: [true, "Tên Chi hội không được để trống"],
      trim: true,
    },

    moTa: {
      type: String,
      trim: true,
      default: "",
    },

    chiHoiTruongId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "chi_hoi",
   }
);

const ChiHoi: Model<IChiHoi> =
  (models.ChiHoi as Model<IChiHoi>) ||
  mongoose.model<IChiHoi>("ChiHoi", ChiHoiSchema);

export default ChiHoi;