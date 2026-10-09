import mongoose, {
  Document,
  Model,
  Schema,
  Types,
} from "mongoose";

/* =========================================================
   INTERFACE
========================================================= */

export interface IDanhGiaHoatDong
  extends Document {
  /* =======================================================
     SCHEMA HIỆN TẠI
  ======================================================= */

  hoatDongId:
    Types.ObjectId;

  hoiVienId:
    Types.ObjectId;

  dangKyHoatDongId?:
    Types.ObjectId | null;

  diemDanhGia:
    number;

  nhanXet:
    string;

  deXuat:
    string;

  anDanh:
    boolean;

  thoiGianDanhGia:
    Date;

  /* =======================================================
     LEGACY
     Giữ optional để không làm lỗi record cũ.
  ======================================================= */

  nguoiDungId?:
    Types.ObjectId;

  diemChatLuong?:
    number;

  diemNoiDung?:
    number;

  diemToChuc?:
    number;

  noiDungDanhGia?:
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

const DanhGiaHoatDongSchema =
  new Schema<IDanhGiaHoatDong>(
    {
      /* ===================================================
         IDENTIFIERS
      =================================================== */

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

      dangKyHoatDongId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "DangKyHoatDong",

        default:
          null,

        index:
          true,
      },

      /* ===================================================
         ĐÁNH GIÁ HIỆN TẠI
      =================================================== */

      diemDanhGia: {
        type:
          Number,

        min: [
          1,
          "Điểm đánh giá tối thiểu là 1",
        ],

        max: [
          5,
          "Điểm đánh giá tối đa là 5",
        ],

        required: [
          true,
          "Vui lòng chọn điểm đánh giá",
        ],
      },

      nhanXet: {
        type:
          String,

        trim:
          true,

        default:
          "",

        maxlength: [
          2000,
          "Nhận xét không được vượt quá 2000 ký tự",
        ],
      },

      deXuat: {
        type:
          String,

        trim:
          true,

        default:
          "",

        maxlength: [
          2000,
          "Đề xuất không được vượt quá 2000 ký tự",
        ],
      },

      anDanh: {
        type:
          Boolean,

        default:
          false,
      },

      thoiGianDanhGia: {
        type:
          Date,

        default:
          Date.now,

        index:
          true,
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

      diemChatLuong: {
        type:
          Number,

        min:
          1,

        max:
          5,

        required:
          false,
      },

      diemNoiDung: {
        type:
          Number,

        min:
          1,

        max:
          5,

        required:
          false,
      },

      diemToChuc: {
        type:
          Number,

        min:
          1,

        max:
          5,

        required:
          false,
      },

      noiDungDanhGia: {
        type:
          String,

        trim:
          true,

        default:
          "",

        required:
          false,

        maxlength:
          2000,
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
          2000,
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

/*
 * Một Hội viên chỉ có một bản ghi đánh giá
 * cho một hoạt động.
 *
 * API hiện tại sẽ UPDATE record nếu đánh giá lại.
 */
DanhGiaHoatDongSchema.index(
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
      "unique_danh_gia_hoat_dong_hoi_vien",
  },
);

DanhGiaHoatDongSchema.index({
  hoatDongId:
    1,

  thoiGianDanhGia:
    -1,
});

DanhGiaHoatDongSchema.index({
  hoiVienId:
    1,

  thoiGianDanhGia:
    -1,
});

DanhGiaHoatDongSchema.index({
  dangKyHoatDongId:
    1,
});

/* =========================================================
   MODEL
========================================================= */

const DanhGiaHoatDong:
  Model<IDanhGiaHoatDong> =
  (mongoose.models
    .DanhGiaHoatDong as
    Model<IDanhGiaHoatDong>) ||
  mongoose.model<IDanhGiaHoatDong>(
    "DanhGiaHoatDong",

    DanhGiaHoatDongSchema,
  );

export default DanhGiaHoatDong;