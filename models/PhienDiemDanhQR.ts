import mongoose, {
  Model,
  Schema,
  Types,
} from "mongoose";

export type TrangThaiPhienQR =
  | "DANG_MO"
  | "DA_DONG";

export interface IPhienDiemDanhQR {
  token: string;

  hoatDongId: Types.ObjectId;

  /*
   * Nếu Chi hội trưởng tạo QR
   * thì QR chỉ dành cho Chi hội của mình.
   *
   * ADMIN/BCH có thể tạo QR toàn hoạt động,
   * khi đó chiHoiId = null.
   */
  chiHoiId?: Types.ObjectId | null;

  nguoiTaoId: Types.ObjectId;

  nguoiTaoTen: string;

  thoiGianBatDau: Date;

  thoiGianHetHan: Date;

  trangThai: TrangThaiPhienQR;

  createdAt?: Date;

  updatedAt?: Date;
}

const PhienDiemDanhQRSchema =
  new Schema<IPhienDiemDanhQR>(
    {
      token: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
      },

      hoatDongId: {
        type: Schema.Types.ObjectId,
        ref: "HoatDong",
        required: true,
        index: true,
      },

      chiHoiId: {
        type: Schema.Types.ObjectId,
        ref: "ChiHoi",
        default: null,
        index: true,
      },

      nguoiTaoId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      nguoiTaoTen: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
      },

      thoiGianBatDau: {
        type: Date,
        required: true,
        default: Date.now,
      },

      thoiGianHetHan: {
        type: Date,
        required: true,
        index: true,
      },

      trangThai: {
        type: String,
        enum: [
          "DANG_MO",
          "DA_DONG",
        ],
        default: "DANG_MO",
        index: true,
      },
    },
    {
      timestamps: true,
      collection: "phien_diem_danh_qr",
      versionKey: false,
    },
  );

PhienDiemDanhQRSchema.index({
  hoatDongId: 1,
  createdAt: -1,
});

PhienDiemDanhQRSchema.index({
  chiHoiId: 1,
  createdAt: -1,
});

const PhienDiemDanhQR:
  Model<IPhienDiemDanhQR> =
  (mongoose.models
    .PhienDiemDanhQR as
    Model<IPhienDiemDanhQR>) ||
  mongoose.model<IPhienDiemDanhQR>(
    "PhienDiemDanhQR",
    PhienDiemDanhQRSchema,
  );

export default PhienDiemDanhQR;