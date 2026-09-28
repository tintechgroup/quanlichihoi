import mongoose, {
  Document,
  Model,
  Schema,
  Types,
} from "mongoose";

export type XepLoaiBanChapHanh =
  | "XUAT_SAC"
  | "TOT"
  | "KHA"
  | "TRUNG_BINH"
  | "YEU";

export interface IDanhGiaBanChapHanh extends Document {
  banChapHanhId: Types.ObjectId;
  xepLoai: XepLoaiBanChapHanh;
  nhanXet: string;
  nguoiDanhGiaId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DanhGiaBanChapHanhSchema =
  new Schema<IDanhGiaBanChapHanh>(
    {
      banChapHanhId: {
        type: Schema.Types.ObjectId,
        ref: "BanChapHanh",
        required: [
          true,
          "Thành viên Ban Chấp hành không được để trống",
        ],
        unique: true,
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
          message: "Xếp loại Ban Chấp hành không hợp lệ",
        },
        required: [true, "Xếp loại không được để trống"],
      },

      nhanXet: {
        type: String,
        trim: true,
        default: "",
        maxlength: [
          1000,
          "Nội dung nhận xét không được vượt quá 1000 ký tự",
        ],
      },

      nguoiDanhGiaId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Người đánh giá không được để trống"],
      },
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

DanhGiaBanChapHanhSchema.index({
  banChapHanhId: 1,
  updatedAt: -1,
});

DanhGiaBanChapHanhSchema.index({
  xepLoai: 1,
});

const DanhGiaBanChapHanh: Model<IDanhGiaBanChapHanh> =
  mongoose.models.DanhGiaBanChapHanh ||
  mongoose.model<IDanhGiaBanChapHanh>(
    "DanhGiaBanChapHanh",
    DanhGiaBanChapHanhSchema,
  );

export default DanhGiaBanChapHanh;