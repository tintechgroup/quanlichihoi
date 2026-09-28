import mongoose, {
  Document,
  Model,
  Schema,
  Types,
} from "mongoose";

export interface IDanhGiaHoatDong
  extends Document {
  hoatDongId: Types.ObjectId;
  hoiVienId: Types.ObjectId;
  dangKyHoatDongId: Types.ObjectId;

  diemDanhGia: number;
  nhanXet?: string;
  deXuat?: string;

  anDanh: boolean;
  thoiGianDanhGia: Date;

  createdAt: Date;
  updatedAt: Date;
}

const DanhGiaHoatDongSchema =
  new Schema<IDanhGiaHoatDong>(
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

      dangKyHoatDongId: {
        type: Schema.Types.ObjectId,
        ref: "DangKyHoatDong",
        required: [
          true,
          "Thông tin đăng ký không được để trống",
        ],
        index: true,
      },

      diemDanhGia: {
        type: Number,
        required: [
          true,
          "Điểm đánh giá không được để trống",
        ],
        min: [
          1,
          "Điểm đánh giá thấp nhất là 1",
        ],
        max: [
          5,
          "Điểm đánh giá cao nhất là 5",
        ],
      },

      nhanXet: {
        type: String,
        trim: true,
        maxlength: [
          2000,
          "Nhận xét không được vượt quá 2000 ký tự",
        ],
        default: "",
      },

      deXuat: {
        type: String,
        trim: true,
        maxlength: [
          2000,
          "Đề xuất không được vượt quá 2000 ký tự",
        ],
        default: "",
      },

      anDanh: {
        type: Boolean,
        default: false,
      },

      thoiGianDanhGia: {
        type: Date,
        default: Date.now,
        required: true,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

/*
 * Mỗi Hội viên chỉ có một đánh giá
 * cho mỗi hoạt động.
 *
 * Nếu đánh giá lại, API sẽ cập nhật
 * bản ghi hiện có.
 */
DanhGiaHoatDongSchema.index(
  {
    hoatDongId: 1,
    hoiVienId: 1,
  },
  {
    unique: true,
    name:
      "unique_danh_gia_hoat_dong_hoi_vien",
  }
);

/*
 * Một bản đăng ký chỉ được liên kết
 * với một đánh giá.
 */
DanhGiaHoatDongSchema.index(
  {
    dangKyHoatDongId: 1,
  },
  {
    unique: true,
    name:
      "unique_danh_gia_theo_dang_ky",
  }
);

/*
 * Phục vụ thống kê đánh giá theo hoạt động.
 */
DanhGiaHoatDongSchema.index({
  hoatDongId: 1,
  diemDanhGia: 1,
  createdAt: -1,
});

/*
 * Phục vụ lấy lịch sử đánh giá
 * của từng Hội viên.
 */
DanhGiaHoatDongSchema.index({
  hoiVienId: 1,
  createdAt: -1,
});

const DanhGiaHoatDong: Model<IDanhGiaHoatDong> =
  mongoose.models.DanhGiaHoatDong ||
  mongoose.model<IDanhGiaHoatDong>(
    "DanhGiaHoatDong",
    DanhGiaHoatDongSchema
  );

export default DanhGiaHoatDong;