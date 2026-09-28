import mongoose, {
  Document,
  Model,
  Schema,
  Types,
} from "mongoose";

export type HanhDongNhatKy =
  | "DANG_NHAP"
  | "DANG_XUAT"
  | "DANG_NHAP_THAT_BAI"
  | "TAO_MOI"
  | "CAP_NHAT"
  | "XOA"
  | "KHOA_TAI_KHOAN"
  | "MO_KHOA_TAI_KHOAN"
  | "DOI_MAT_KHAU"
  | "DAT_LAI_MAT_KHAU"
  | "CAP_TAI_KHOAN"
  | "XUAT_EXCEL"
  | "SAO_LUU"
  | "KHOI_PHUC"
  | "KHAC";

export type MucDoNhatKy =
  | "THONG_TIN"
  | "CANH_BAO"
  | "NGUY_HIEM";

export type KetQuaNhatKy =
  | "THANH_CONG"
  | "THAT_BAI";

export interface INhatKyHeThong extends Document {
  nguoiDungId?: Types.ObjectId;
  tenDangNhap?: string;
  hoTen?: string;
  vaiTro?: string;

  hanhDong: HanhDongNhatKy;
  module: string;
  moTa: string;

  doiTuongId?: Types.ObjectId;
  doiTuongLoai?: string;
  duLieuCu?: Record<string, unknown>;
  duLieuMoi?: Record<string, unknown>;

  diaChiIP?: string;
  userAgent?: string;
  duongDan?: string;
  phuongThuc?: string;

  mucDo: MucDoNhatKy;
  ketQua: KetQuaNhatKy;
  loi?: string;

  createdAt: Date;
  updatedAt: Date;
}

const NhatKyHeThongSchema =
  new Schema<INhatKyHeThong>(
    {
      nguoiDungId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: undefined,
        index: true,
      },

      tenDangNhap: {
        type: String,
        trim: true,
        maxlength: [
          100,
          "Tên đăng nhập không được vượt quá 100 ký tự",
        ],
        default: undefined,
      },

      hoTen: {
        type: String,
        trim: true,
        maxlength: [
          150,
          "Họ tên không được vượt quá 150 ký tự",
        ],
        default: undefined,
      },

      vaiTro: {
        type: String,
        trim: true,
        maxlength: [
          50,
          "Vai trò không được vượt quá 50 ký tự",
        ],
        default: undefined,
      },

      hanhDong: {
        type: String,
        required: [
          true,
          "Hành động nhật ký không được để trống",
        ],
        enum: {
          values: [
            "DANG_NHAP",
            "DANG_XUAT",
            "DANG_NHAP_THAT_BAI",
            "TAO_MOI",
            "CAP_NHAT",
            "XOA",
            "KHOA_TAI_KHOAN",
            "MO_KHOA_TAI_KHOAN",
            "DOI_MAT_KHAU",
            "DAT_LAI_MAT_KHAU",
            "CAP_TAI_KHOAN",
            "XUAT_EXCEL",
            "SAO_LUU",
            "KHOI_PHUC",
            "KHAC",
          ],
          message: "Hành động nhật ký không hợp lệ",
        },
        index: true,
      },

      module: {
        type: String,
        required: [
          true,
          "Module nhật ký không được để trống",
        ],
        trim: true,
        uppercase: true,
        maxlength: [
          100,
          "Tên module không được vượt quá 100 ký tự",
        ],
        index: true,
      },

      moTa: {
        type: String,
        required: [
          true,
          "Mô tả nhật ký không được để trống",
        ],
        trim: true,
        maxlength: [
          1000,
          "Mô tả không được vượt quá 1000 ký tự",
        ],
      },

      doiTuongId: {
        type: Schema.Types.ObjectId,
        default: undefined,
        index: true,
      },

      doiTuongLoai: {
        type: String,
        trim: true,
        maxlength: [
          100,
          "Loại đối tượng không được vượt quá 100 ký tự",
        ],
        default: undefined,
      },

      duLieuCu: {
        type: Schema.Types.Mixed,
        default: undefined,
      },

      duLieuMoi: {
        type: Schema.Types.Mixed,
        default: undefined,
      },

      diaChiIP: {
        type: String,
        trim: true,
        maxlength: [
          100,
          "Địa chỉ IP không được vượt quá 100 ký tự",
        ],
        default: undefined,
      },

      userAgent: {
        type: String,
        trim: true,
        maxlength: [
          1000,
          "User Agent không được vượt quá 1000 ký tự",
        ],
        default: undefined,
      },

      duongDan: {
        type: String,
        trim: true,
        maxlength: [
          500,
          "Đường dẫn không được vượt quá 500 ký tự",
        ],
        default: undefined,
      },

      phuongThuc: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: [
          20,
          "Phương thức không được vượt quá 20 ký tự",
        ],
        default: undefined,
      },

      mucDo: {
        type: String,
        enum: {
          values: [
            "THONG_TIN",
            "CANH_BAO",
            "NGUY_HIEM",
          ],
          message: "Mức độ nhật ký không hợp lệ",
        },
        default: "THONG_TIN",
        index: true,
      },

      ketQua: {
        type: String,
        enum: {
          values: ["THANH_CONG", "THAT_BAI"],
          message: "Kết quả nhật ký không hợp lệ",
        },
        default: "THANH_CONG",
        index: true,
      },

      loi: {
        type: String,
        trim: true,
        maxlength: [
          2000,
          "Nội dung lỗi không được vượt quá 2000 ký tự",
        ],
        default: undefined,
      },
    },
    {
      timestamps: true,
      collection: "nhat_ky_he_thong",
      versionKey: false,
    },
  );

/*
 * Các index phục vụ tìm kiếm và lọc nhật ký.
 */
NhatKyHeThongSchema.index({
  createdAt: -1,
});

NhatKyHeThongSchema.index({
  nguoiDungId: 1,
  createdAt: -1,
});

NhatKyHeThongSchema.index({
  module: 1,
  hanhDong: 1,
  createdAt: -1,
});

NhatKyHeThongSchema.index({
  ketQua: 1,
  mucDo: 1,
  createdAt: -1,
});

NhatKyHeThongSchema.index({
  tenDangNhap: "text",
  hoTen: "text",
  moTa: "text",
  module: "text",
});

/*
 * Tự động xóa nhật ký sau 180 ngày.
 * Nếu muốn lưu vĩnh viễn, hãy xóa index này.
 */
NhatKyHeThongSchema.index(
  {
    createdAt: 1,
  },
  {
    expireAfterSeconds: 180 * 24 * 60 * 60,
    name: "xoa_nhat_ky_sau_180_ngay",
  },
);

const NhatKyHeThong: Model<INhatKyHeThong> =
  mongoose.models.NhatKyHeThong ||
  mongoose.model<INhatKyHeThong>(
    "NhatKyHeThong",
    NhatKyHeThongSchema,
  );

export default NhatKyHeThong;