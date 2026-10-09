import mongoose, {
  Model,
  Schema,
  Types,
} from "mongoose";

export type TrangThaiDiemDanh =
  | "CO_MAT"
  | "VANG_MAT"
  | "CO_PHEP";

export interface IChiTietDiemDanh {
  hoiVienId: Types.ObjectId;

  trangThai: TrangThaiDiemDanh;

  ghiChu?: string;
}

export interface IDiemDanhHoatDong {
  dangKyTapTheId: Types.ObjectId;

  hoatDongId: Types.ObjectId;

  chiHoiId: Types.ObjectId;

  chiTiet: IChiTietDiemDanh[];

  nguoiDiemDanhId: Types.ObjectId;

  nguoiDiemDanhTen: string;

  ngayDiemDanh: Date;

  ghiChu?: string;

  createdAt: Date;

  updatedAt: Date;
}

const ChiTietDiemDanhSchema =
  new Schema<IChiTietDiemDanh>(
    {
      hoiVienId: {
        type: Schema.Types.ObjectId,

        ref: "HoiVien",

        required: true,
      },

      trangThai: {
        type: String,

        enum: [
          "CO_MAT",
          "VANG_MAT",
          "CO_PHEP",
        ],

        required: true,
      },

      ghiChu: {
        type: String,

        trim: true,

        maxlength: 500,

        default: "",
      },
    },
    {
      _id: false,
    },
  );

const DiemDanhHoatDongSchema =
  new Schema<IDiemDanhHoatDong>(
    {
      dangKyTapTheId: {
        type: Schema.Types.ObjectId,

        ref: "DangKyTapTheHoatDong",

        required: true,

        unique: true,

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

        required: true,

        index: true,
      },

      chiTiet: {
        type: [
          ChiTietDiemDanhSchema,
        ],

        required: true,

        validate: {
          validator(
            value:
              IChiTietDiemDanh[],
          ) {
            return (
              Array.isArray(
                value,
              ) &&
              value.length > 0
            );
          },

          message:
            "Danh sách điểm danh không được để trống",
        },
      },

      nguoiDiemDanhId: {
        type: Schema.Types.ObjectId,

        ref: "User",

        required: true,
      },

      nguoiDiemDanhTen: {
        type: String,

        required: true,

        trim: true,

        maxlength: 150,
      },

      ngayDiemDanh: {
        type: Date,

        required: true,

        default: Date.now,

        index: true,
      },

      ghiChu: {
        type: String,

        trim: true,

        maxlength: 1000,

        default: "",
      },
    },
    {
      timestamps: true,

      collection:
        "diem_danh_hoat_dong",

      versionKey: false,
    },
  );

DiemDanhHoatDongSchema.index({
  chiHoiId: 1,
  createdAt: -1,
});

DiemDanhHoatDongSchema.index({
  hoatDongId: 1,
  createdAt: -1,
});

const DiemDanhHoatDong: Model<IDiemDanhHoatDong> =
  mongoose.models
    .DiemDanhHoatDong ||
  mongoose.model<IDiemDanhHoatDong>(
    "DiemDanhHoatDong",
    DiemDanhHoatDongSchema,
  );

export default DiemDanhHoatDong;