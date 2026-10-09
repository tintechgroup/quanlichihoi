import mongoose, {
  Model,
  Schema,
  Types,
} from "mongoose";

export type GioiTinh =
  | "NAM"
  | "NU"
  | "KHAC";

export type TrangThaiHoiVien =
  | "DANG_HOAT_DONG"
  | "TAM_NGUNG";

export interface IHoiVien {
  maHoiVien: string;
  hoTen: string;

  ngaySinh?: Date | null;
  gioiTinh?: GioiTinh;

  email?: string;
  soDienThoai?: string;

  lop?: string;
  khoaHoc?: string;
  diaChi?: string;

  /*
   * Chi hội mà Hội viên đang trực thuộc.
   */
  chiHoiId: Types.ObjectId;

  /*
   * Tài khoản đăng nhập của Hội viên.
   * Chỉ có giá trị sau khi được cấp tài khoản.
   */
  taiKhoanId?: Types.ObjectId | null;

  trangThai: TrangThaiHoiVien;

  createdAt: Date;
  updatedAt: Date;
}

const HoiVienSchema =
  new Schema<IHoiVien>(
    {
      maHoiVien: {
        type: String,
        required: [
          true,
          "Mã Hội viên không được để trống",
        ],
        unique: true,
        trim: true,
        uppercase: true,
        maxlength: [
          30,
          "Mã Hội viên không được vượt quá 30 ký tự",
        ],
      },

      hoTen: {
        type: String,
        required: [
          true,
          "Họ tên Hội viên không được để trống",
        ],
        trim: true,
        maxlength: [
          150,
          "Họ tên không được vượt quá 150 ký tự",
        ],
      },

      ngaySinh: {
        type: Date,
        default: undefined,
      },

      gioiTinh: {
        type: String,
        enum: {
          values: ["NAM", "NU", "KHAC"],
          message: "Giới tính không hợp lệ",
        },
        default: undefined,
      },

      email: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: [
          150,
          "Email không được vượt quá 150 ký tự",
        ],
        default: undefined,
      },

      soDienThoai: {
        type: String,
        trim: true,
        maxlength: [
          15,
          "Số điện thoại không được vượt quá 15 ký tự",
        ],
        default: undefined,
      },

      lop: {
        type: String,
        trim: true,
        maxlength: [
          100,
          "Tên lớp không được vượt quá 100 ký tự",
        ],
        default: undefined,
      },

      khoaHoc: {
        type: String,
        trim: true,
        maxlength: [
          50,
          "Khóa học không được vượt quá 50 ký tự",
        ],
        default: undefined,
      },

      diaChi: {
        type: String,
        trim: true,
        maxlength: [
          300,
          "Địa chỉ không được vượt quá 300 ký tự",
        ],
        default: undefined,
      },

      chiHoiId: {
        type: Schema.Types.ObjectId,
        ref: "ChiHoi",
        required: [
          true,
          "Hội viên phải thuộc một Chi hội",
        ],
        index: true,
      },

      taiKhoanId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        unique: true,
        sparse: true,
        default: undefined,
      },

      trangThai: {
        type: String,
        enum: {
          values: [
            "DANG_HOAT_DONG",
            "TAM_NGUNG",
          ],
          message:
            "Trạng thái Hội viên không hợp lệ",
        },
        default: "DANG_HOAT_DONG",
        index: true,
      },
    },
    {
      timestamps: true,
      collection: "hoi_vien",
      versionKey: false,
      toJSON: {
        virtuals: true,
      },
      toObject: {
        virtuals: true,
      },
    }
  );

/*
 * Tìm kiếm Hội viên theo họ tên.
 */
HoiVienSchema.index({
  hoTen: 1,
});

/*
 * Lọc Hội viên theo Chi hội và trạng thái.
 */
HoiVienSchema.index({
  chiHoiId: 1,
  trangThai: 1,
});

/*
 * Tìm Hội viên theo tài khoản đăng nhập.
 */
HoiVienSchema.index({
  taiKhoanId: 1,
});

/*
 * Chuẩn hóa dữ liệu trước khi kiểm tra hợp lệ.
 */
HoiVienSchema.pre("validate", function () {
  if (this.maHoiVien) {
    this.maHoiVien = this.maHoiVien
      .trim()
      .toUpperCase();
  }

  if (this.hoTen) {
    this.hoTen = this.hoTen.trim();
  }

  if (this.email) {
    this.email = this.email
      .trim()
      .toLowerCase();
  }

  if (this.soDienThoai) {
    this.soDienThoai =
      this.soDienThoai.trim();
  }

  if (this.lop) {
    this.lop = this.lop.trim();
  }

  if (this.khoaHoc) {
    this.khoaHoc =
      this.khoaHoc.trim();
  }

  if (this.diaChi) {
    this.diaChi = this.diaChi.trim();
  }
});

/*
 * Không cho lưu trạng thái rỗng.
 */
HoiVienSchema.pre("save", function () {
  if (!this.trangThai) {
    this.trangThai =
      "DANG_HOAT_DONG";
  }
});

const HoiVien: Model<IHoiVien> =
  mongoose.models.HoiVien ||
  mongoose.model<IHoiVien>(
    "HoiVien",
    HoiVienSchema
  );

export default HoiVien;
