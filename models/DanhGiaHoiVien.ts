import mongoose, { Model, Schema, Types } from "mongoose";

export type XepLoaiHoiVien =
  | "XUAT_SAC"
  | "TOT"
  | "KHA"
  | "TRUNG_BINH"
  | "YEU";

export interface IDanhGiaHoiVien {
  hoiVienId: Types.ObjectId;
  xepLoai: XepLoaiHoiVien;
  nhanXet?: string;
  nguoiDanhGiaId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DanhGiaHoiVienSchema = new Schema<IDanhGiaHoiVien>(
  {
    hoiVienId: {
      type: Schema.Types.ObjectId,
      ref: "HoiVien",
      required: [true, "Hội viên được đánh giá không được để trống"],
      unique: true,
      index: true,
    },

    xepLoai: {
      type: String,
      enum: {
        values: [
          "XUAT_SAC",
          "TOT",
          "KHA",
          "TRUNG_BINH",
          "YEU",
        ],
        message: "Xếp loại Hội viên không hợp lệ",
      },
      required: [true, "Xếp loại không được để trống"],
    },

    nhanXet: {
      type: String,
      trim: true,
      maxlength: [
        1000,
        "Nội dung nhận xét không được vượt quá 1000 ký tự",
      ],
      default: "",
    },

    nguoiDanhGiaId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Người đánh giá không được để trống"],
    },
  },
  {
    timestamps: true,
    collection: "danh_gia_hoi_vien",
  },
);

const DanhGiaHoiVien: Model<IDanhGiaHoiVien> =
  mongoose.models.DanhGiaHoiVien ||
  mongoose.model<IDanhGiaHoiVien>(
    "DanhGiaHoiVien",
    DanhGiaHoiVienSchema,
  );

export default DanhGiaHoiVien;