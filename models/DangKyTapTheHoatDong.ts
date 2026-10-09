import mongoose, {
  Model,
  Schema,
  Types,
} from "mongoose";

export type TrangThaiDangKyTapThe =
  | "DA_GUI"
  | "DA_TIEP_NHAN";

export interface IDangKyTapTheHoatDong {
  hoatDongId: Types.ObjectId;

  chiHoiId: Types.ObjectId;

  hoiVienIds: Types.ObjectId[];

  nguoiGuiId: Types.ObjectId;

  nguoiGuiTen: string;

  trangThai: TrangThaiDangKyTapThe;

  nguoiTiepNhanId?: Types.ObjectId | null;

  nguoiTiepNhanTen?: string;

  ngayTiepNhan?: Date | null;

  ghiChu?: string;

  createdAt: Date;

  updatedAt: Date;
}

const DangKyTapTheHoatDongSchema =
  new Schema<IDangKyTapTheHoatDong>(
    {
      hoatDongId: {
        type:
          Schema.Types.ObjectId,

        ref: "HoatDong",

        required: true,

        index: true,
      },

      chiHoiId: {
        type:
          Schema.Types.ObjectId,

        ref: "ChiHoi",

        required: true,

        index: true,
      },

      hoiVienIds: {
        type: [
          {
            type:
              Schema.Types.ObjectId,

            ref: "HoiVien",
          },
        ],

        required: true,

        validate: {
          validator(
            value: Types.ObjectId[],
          ) {
            return (
              Array.isArray(value) &&
              value.length > 0
            );
          },

          message:
            "Danh sách đăng ký phải có ít nhất một Hội viên",
        },
      },

      nguoiGuiId: {
        type:
          Schema.Types.ObjectId,

        ref: "User",

        required: true,

        index: true,
      },

      nguoiGuiTen: {
        type: String,

        required: true,

        trim: true,

        maxlength: 150,
      },

      trangThai: {
        type: String,

        enum: [
          "DA_GUI",
          "DA_TIEP_NHAN",
        ],

        default:
          "DA_GUI",

        index: true,
      },

      nguoiTiepNhanId: {
        type:
          Schema.Types.ObjectId,

        ref: "User",

        default: null,
      },

      nguoiTiepNhanTen: {
        type: String,

        trim: true,

        default: "",
      },

      ngayTiepNhan: {
        type: Date,

        default: null,
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
        "dang_ky_tap_the_hoat_dong",

      versionKey: false,
    },
  );

/*
 * Mỗi Chi hội chỉ gửi một danh sách
 * cho một hoạt động.
 */
DangKyTapTheHoatDongSchema.index(
  {
    hoatDongId: 1,
    chiHoiId: 1,
  },
  {
    unique: true,
  },
);

DangKyTapTheHoatDongSchema.index({
  trangThai: 1,
  createdAt: -1,
});

const DangKyTapTheHoatDong: Model<IDangKyTapTheHoatDong> =
  mongoose.models
    .DangKyTapTheHoatDong ||
  mongoose.model<IDangKyTapTheHoatDong>(
    "DangKyTapTheHoatDong",
    DangKyTapTheHoatDongSchema,
  );

export default DangKyTapTheHoatDong;