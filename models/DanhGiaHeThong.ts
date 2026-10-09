import mongoose, {
  Document,
  Model,
  Schema,
  Types,
} from "mongoose";

/* =========================================================
   TYPES
========================================================= */

export type VaiTroDanhGiaHeThong =
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | "HOI_VIEN";

export type NhomDanhGiaHeThong =
  | "GIAO_DIEN"
  | "TINH_NANG"
  | "HIEU_NANG"
  | "DE_XUAT"
  | "KHAC";

export type TrangThaiDanhGiaHeThong =
  | "MOI"
  | "DA_XEM"
  | "DA_GHI_NHAN";

export interface IDanhGiaHeThong
  extends Document {
  /* =======================================================
     SCHEMA HIỆN TẠI
  ======================================================= */

  nguoiDanhGiaId:
    Types.ObjectId;

  nguoiDanhGiaTen:
    string;

  vaiTro:
    VaiTroDanhGiaHeThong;

  soSao:
    number;

  nhom:
    NhomDanhGiaHeThong;

  noiDung:
    string;

  trangThai:
    TrangThaiDanhGiaHeThong;

  phanHoiQuanTri:
    string;

  nguoiPhanHoiId?:
    Types.ObjectId | null;

  nguoiPhanHoiTen:
    string;

  ngayPhanHoi?:
    Date | null;

  /* =======================================================
     FIELD LEGACY
     Giữ optional để không làm hỏng dữ liệu cũ trong MongoDB.
  ======================================================= */

  nguoiDungId?:
    Types.ObjectId;

  loaiNguoiDung?:
    | "HOI_VIEN"
    | "BAN_CHAP_HANH";

  mucDoHaiLong?:
    number;

  deSuDung?:
    number;

  tinhHieuQua?:
    number;

  mucDoPhuHop?:
    number;

  noiDungGopY?:
    string;

  deXuatCaiThien?:
    string;

  createdAt:
    Date;

  updatedAt:
    Date;
}

/* =========================================================
   SCHEMA
========================================================= */

const DanhGiaHeThongSchema =
  new Schema<IDanhGiaHeThong>(
    {
      /* ===================================================
         SCHEMA HIỆN TẠI
      =================================================== */

      nguoiDanhGiaId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        required: [
          true,
          "Người đánh giá không được để trống",
        ],

        index:
          true,
      },

      nguoiDanhGiaTen: {
        type:
          String,

        trim:
          true,

        required: [
          true,
          "Tên người đánh giá không được để trống",
        ],

        maxlength:
          255,
      },

      vaiTro: {
        type:
          String,

        enum: [
          "ADMIN",
          "BAN_CHAP_HANH",
          "CHI_HOI_TRUONG",
          "HOI_VIEN",
        ],

        required:
          true,

        index:
          true,
      },

      soSao: {
        type:
          Number,

        required: [
          true,
          "Vui lòng chọn số sao đánh giá",
        ],

        min: [
          1,
          "Số sao tối thiểu là 1",
        ],

        max: [
          5,
          "Số sao tối đa là 5",
        ],

        index:
          true,
      },

      nhom: {
        type:
          String,

        enum: [
          "GIAO_DIEN",
          "TINH_NANG",
          "HIEU_NANG",
          "DE_XUAT",
          "KHAC",
        ],

        default:
          "KHAC",

        index:
          true,
      },

      noiDung: {
        type:
          String,

        trim:
          true,

        required: [
          true,
          "Vui lòng nhập nội dung đánh giá",
        ],

        maxlength: [
          3000,
          "Nội dung đánh giá không được vượt quá 3000 ký tự",
        ],
      },

      trangThai: {
        type:
          String,

        enum: [
          "MOI",
          "DA_XEM",
          "DA_GHI_NHAN",
        ],

        default:
          "MOI",

        index:
          true,
      },

      phanHoiQuanTri: {
        type:
          String,

        trim:
          true,

        default:
          "",

        maxlength: [
          3000,
          "Phản hồi quản trị không được vượt quá 3000 ký tự",
        ],
      },

      nguoiPhanHoiId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,

        index:
          true,
      },

      nguoiPhanHoiTen: {
        type:
          String,

        trim:
          true,

        default:
          "",

        maxlength:
          255,
      },

      ngayPhanHoi: {
        type:
          Date,

        default:
          null,
      },

      /* ===================================================
         LEGACY FIELDS
      =================================================== */

      nguoiDungId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        required:
          false,

        index:
          true,
      },

      loaiNguoiDung: {
        type:
          String,

        enum: [
          "HOI_VIEN",
          "BAN_CHAP_HANH",
        ],

        required:
          false,
      },

      mucDoHaiLong: {
        type:
          Number,

        min:
          1,

        max:
          5,

        required:
          false,
      },

      deSuDung: {
        type:
          Number,

        min:
          1,

        max:
          5,

        required:
          false,
      },

      tinhHieuQua: {
        type:
          Number,

        min:
          1,

        max:
          5,

        required:
          false,
      },

      mucDoPhuHop: {
        type:
          Number,

        min:
          1,

        max:
          5,

        required:
          false,
      },

      noiDungGopY: {
        type:
          String,

        trim:
          true,

        default:
          "",

        required:
          false,

        maxlength:
          3000,
      },

      deXuatCaiThien: {
        type:
          String,

        trim:
          true,

        default:
          "",

        required:
          false,

        maxlength:
          3000,
      },
    },
    {
      timestamps:
        true,

      versionKey:
        false,
    },
  );

/* =========================================================
   INDEXES
========================================================= */

DanhGiaHeThongSchema.index({
  nguoiDanhGiaId:
    1,

  createdAt:
    -1,
});

DanhGiaHeThongSchema.index({
  trangThai:
    1,

  createdAt:
    -1,
});

DanhGiaHeThongSchema.index({
  nhom:
    1,

  createdAt:
    -1,
});

DanhGiaHeThongSchema.index({
  soSao:
    1,

  createdAt:
    -1,
});

/* =========================================================
   MODEL
========================================================= */

const DanhGiaHeThong:
  Model<IDanhGiaHeThong> =
  (mongoose.models
    .DanhGiaHeThong as
    Model<IDanhGiaHeThong>) ||
  mongoose.model<IDanhGiaHeThong>(
    "DanhGiaHeThong",

    DanhGiaHeThongSchema,
  );

export default DanhGiaHeThong;