import mongoose, {
  Model,
  Schema,
  Types,
} from "mongoose";

export interface ILuotDiemDanhQR {
  phienId: Types.ObjectId;

  hoatDongId: Types.ObjectId;

  chiHoiId?: Types.ObjectId | null;

  hoiVienId: Types.ObjectId;

  userId: Types.ObjectId;

  hoTen: string;

  maHoiVien: string;

  thoiGianDiemDanh: Date;

  ipAddress?: string;

  userAgent?: string;

  createdAt?: Date;

  updatedAt?: Date;
}

const LuotDiemDanhQRSchema =
  new Schema<ILuotDiemDanhQR>(
    {
      phienId: {
        type: Schema.Types.ObjectId,
        ref: "PhienDiemDanhQR",
        required: true,
        index: true,
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

      hoiVienId: {
        type: Schema.Types.ObjectId,
        ref: "HoiVien",
        required: true,
        index: true,
      },

      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      hoTen: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
      },

      maHoiVien: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },

      thoiGianDiemDanh: {
        type: Date,
        required: true,
        default: Date.now,
        index: true,
      },

      ipAddress: {
        type: String,
        trim: true,
        default: "",
      },

      userAgent: {
        type: String,
        trim: true,
        default: "",
      },
    },
    {
      timestamps: true,
      collection: "luot_diem_danh_qr",
      versionKey: false,
    },
  );

/*
 * Một Hội viên chỉ được quét một lần
 * trong một phiên QR.
 */
LuotDiemDanhQRSchema.index(
  {
    phienId: 1,
    hoiVienId: 1,
  },
  {
    unique: true,
    name:
      "unique_phien_qr_hoi_vien",
  },
);

LuotDiemDanhQRSchema.index({
  hoatDongId: 1,
  thoiGianDiemDanh: -1,
});

const LuotDiemDanhQR:
  Model<ILuotDiemDanhQR> =
  (mongoose.models
    .LuotDiemDanhQR as
    Model<ILuotDiemDanhQR>) ||
  mongoose.model<ILuotDiemDanhQR>(
    "LuotDiemDanhQR",
    LuotDiemDanhQRSchema,
  );

export default LuotDiemDanhQR;