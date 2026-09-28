import mongoose, {
  Model,
  models,
  Schema,
  Types,
} from "mongoose";

export type XepLoaiChiHoi =
  | "XUAT_SAC"
  | "TOT"
  | "KHA"
  | "TRUNG_BINH"
  | "YEU";

export interface IDanhGiaChiHoi {
  chiHoiId: Types.ObjectId;
  xepLoai: XepLoaiChiHoi;
  nhanXet: string;
  nguoiDanhGiaId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DanhGiaChiHoiSchema = new Schema<IDanhGiaChiHoi>(
  {
    chiHoiId: {
      type: Schema.Types.ObjectId,
      ref: "ChiHoi",
      required: true,
      unique: true,
    },

    xepLoai: {
      type: String,
      enum: [
        "XUAT_SAC",
        "TOT",
        "KHA",
        "TRUNG_BINH",
        "YEU",
      ],
      required: [true, "Vui lòng chọn xếp loại"],
    },

    nhanXet: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },

    nguoiDanhGiaId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "danh_gia_chi_hoi",
  }
);

const DanhGiaChiHoi: Model<IDanhGiaChiHoi> =
  (models.DanhGiaChiHoi as Model<IDanhGiaChiHoi>) ||
  mongoose.model<IDanhGiaChiHoi>(
    "DanhGiaChiHoi",
    DanhGiaChiHoiSchema
  );

export default DanhGiaChiHoi;