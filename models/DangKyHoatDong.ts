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
  | "DA_HUY";

export interface IDangKyHoatDong extends Document {
  hoatDongId: Types.ObjectId;
  hoiVienId: Types.ObjectId;

  trangThai: TrangThaiDangKy;

  thoiGianDangKy: Date;
  thoiGianHuy?: Date | null;

  lyDoHuy?: string;
  ghiChu?: string;

  nguoiCapNhatId?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const DangKyHoatDongSchema =
  new Schema<IDangKyHoatDong>(
    {
      hoatDongId: {
        type: Schema.Types.ObjectId,
        ref: "HoatDong",
        required: [
          true,
          "Hoạt động không được để trống",
        ],
        index: true,
      },

      hoiVienId: {
        type: Schema.Types.ObjectId,
        ref: "HoiVien",
        required: [
          true,
          "Hội viên không được để trống",
        ],
        index: true,
      },

      trangThai: {
        type: String,
        enum: [
          "DA_DANG_KY",
          "DA_THAM_GIA",
          "VANG_MAT",
          "DA_HUY",
        ],
        default: "DA_DANG_KY",
        required: true,
        index: true,
      },

      thoiGianDangKy: {
        type: Date,
        default: Date.now,
        required: true,
      },

      thoiGianHuy: {
        type: Date,
        default: undefined,
      },

      lyDoHuy: {
        type: String,
        trim: true,
        maxlength: [
          500,
          "Lý do hủy không được vượt quá 500 ký tự",
        ],
        default: "",
      },

      ghiChu: {
        type: String,
        trim: true,
        maxlength: [
          1000,
          "Ghi chú không được vượt quá 1000 ký tự",
        ],
        default: "",
      },

      nguoiCapNhatId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: undefined,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

/*
 * Một Hội viên chỉ có một bản ghi đăng ký
 * cho mỗi hoạt động.
 *
 * Khi Hội viên đăng ký lại sau khi hủy,
 * API sẽ cập nhật bản ghi cũ thành DA_DANG_KY
 * thay vì tạo thêm bản ghi trùng.
 */
DangKyHoatDongSchema.index(
  {
    hoatDongId: 1,
    hoiVienId: 1,
  },
  {
    unique: true,
    name: "unique_hoat_dong_hoi_vien",
  }
);

/*
 * Hỗ trợ lấy nhanh danh sách người đăng ký
 * của một hoạt động theo trạng thái.
 */
DangKyHoatDongSchema.index({
  hoatDongId: 1,
  trangThai: 1,
  thoiGianDangKy: -1,
});

/*
 * Hỗ trợ lấy lịch sử tham gia hoạt động
 * của một Hội viên.
 */
DangKyHoatDongSchema.index({
  hoiVienId: 1,
  trangThai: 1,
  createdAt: -1,
});

const DangKyHoatDong: Model<IDangKyHoatDong> =
  mongoose.models.DangKyHoatDong ||
  mongoose.model<IDangKyHoatDong>(
    "DangKyHoatDong",
    DangKyHoatDongSchema
  );

export default DangKyHoatDong;