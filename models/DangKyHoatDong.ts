import mongoose, {
  Document,
  Model,
  Schema,
  Types,
} from "mongoose";

export type TrangThaiDangKy =
  | "DA_DANG_KY"
  | "DA_THAM_GIA"
  | "VANG_MAT"
  | "VANG_CO_LY_DO"
  | "DA_HUY";

export interface IDangKyHoatDong
  extends Document {
  hoatDongId: Types.ObjectId;

  hoiVienId: Types.ObjectId;

  trangThai:
    TrangThaiDangKy;

  thoiGianDangKy:
    Date;

  thoiGianHuy?:
    | Date
    | null;

  thoiGianDiemDanh?:
    | Date
    | null;

  lyDoHuy?:
    string;

  lyDoVang?:
    string;

  ghiChu?:
    string;

  nguoiCapNhatId?:
    Types.ObjectId;

  createdAt:
    Date;

  updatedAt:
    Date;
}

const DangKyHoatDongSchema =
  new Schema<IDangKyHoatDong>(
    {
      hoatDongId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "HoatDong",

        required: [
          true,
          "Hoạt động không được để trống",
        ],

        index:
          true,
      },

      hoiVienId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "HoiVien",

        required: [
          true,
          "Hội viên không được để trống",
        ],

        index:
          true,
      },

      trangThai: {
        type:
          String,

        enum: [
          "DA_DANG_KY",
          "DA_THAM_GIA",
          "VANG_MAT",
          "VANG_CO_LY_DO",
          "DA_HUY",
        ],

        default:
          "DA_DANG_KY",

        required:
          true,

        index:
          true,
      },

      thoiGianDangKy: {
        type:
          Date,

        default:
          Date.now,

        required:
          true,
      },

      thoiGianHuy: {
        type:
          Date,

        default:
          undefined,
      },

      thoiGianDiemDanh: {
        type:
          Date,

        default:
          undefined,
      },

      lyDoHuy: {
        type:
          String,

        trim:
          true,

        maxlength: [
          500,
          "Lý do hủy không được vượt quá 500 ký tự",
        ],

        default:
          "",
      },

      lyDoVang: {
        type:
          String,

        trim:
          true,

        maxlength: [
          1000,
          "Lý do vắng không được vượt quá 1000 ký tự",
        ],

        default:
          "",
      },

      ghiChu: {
        type:
          String,

        trim:
          true,

        maxlength: [
          1000,
          "Ghi chú không được vượt quá 1000 ký tự",
        ],

        default:
          "",
      },

      nguoiCapNhatId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          undefined,
      },
    },
    {
      timestamps:
        true,

      versionKey:
        false,
    },
  );

/*
 * Mỗi Hội viên chỉ có
 * một đăng ký/hoạt động.
 */
DangKyHoatDongSchema.index(
  {
    hoatDongId:
      1,

    hoiVienId:
      1,
  },
  {
    unique:
      true,

    name:
      "unique_hoat_dong_hoi_vien",
  },
);

/*
 * Danh sách đăng ký
 * theo hoạt động.
 */
DangKyHoatDongSchema.index({
  hoatDongId:
    1,

  trangThai:
    1,

  thoiGianDangKy:
    -1,
});

/*
 * Lịch sử của Hội viên.
 */
DangKyHoatDongSchema.index({
  hoiVienId:
    1,

  trangThai:
    1,

  createdAt:
    -1,
});

/*
 * Phục vụ thống kê
 * điểm danh.
 */
DangKyHoatDongSchema.index({
  hoatDongId:
    1,

  thoiGianDiemDanh:
    -1,
});

const DangKyHoatDong:
  Model<IDangKyHoatDong> =
    mongoose.models
      .DangKyHoatDong ||
    mongoose.model<IDangKyHoatDong>(
      "DangKyHoatDong",

      DangKyHoatDongSchema,
    );

export default DangKyHoatDong;