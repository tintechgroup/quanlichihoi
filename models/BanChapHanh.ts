import mongoose, {
  Document,
  Model,
  Schema,
  Types,
} from "mongoose";

export type TrangThaiBanChapHanh =
  | "DANG_DUONG_NHIEM"
  | "DA_KET_THUC";

export interface IBanChapHanh extends Document {
  maBanChapHanh: string;
  hoiVienId: Types.ObjectId;
  chiHoiId: Types.ObjectId;
  chucVu: string;
  nhiemKy: string;
  ngayBatDau: Date;
  ngayKetThuc?: Date | null;
  taiKhoanId?: Types.ObjectId | null;
  trangThai: TrangThaiBanChapHanh;
  createdAt: Date;
  updatedAt: Date;
}

const BanChapHanhSchema = new Schema<IBanChapHanh>(
  {
    maBanChapHanh: {
      type: String,
      required: [true, "Mã Ban Chấp hành không được để trống"],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [
        30,
        "Mã Ban Chấp hành không được vượt quá 30 ký tự",
      ],
    },

    hoiVienId: {
      type: Schema.Types.ObjectId,
      ref: "HoiVien",
      required: [true, "Hội viên không được để trống"],
    },

    chiHoiId: {
      type: Schema.Types.ObjectId,
      ref: "ChiHoi",
      required: [true, "Chi hội không được để trống"],
    },

    chucVu: {
      type: String,
      required: [true, "Chức vụ không được để trống"],
      trim: true,
      maxlength: [100, "Chức vụ không được vượt quá 100 ký tự"],
    },

    nhiemKy: {
      type: String,
      required: [true, "Nhiệm kỳ không được để trống"],
      trim: true,
      maxlength: [50, "Nhiệm kỳ không được vượt quá 50 ký tự"],
    },

    ngayBatDau: {
      type: Date,
      required: [true, "Ngày bắt đầu không được để trống"],
    },

    ngayKetThuc: {
      type: Date,
      default: null,
    },

    taiKhoanId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    trangThai: {
      type: String,
      enum: {
        values: ["DANG_DUONG_NHIEM", "DA_KET_THUC"],
        message: "Trạng thái Ban Chấp hành không hợp lệ",
      },
      default: "DANG_DUONG_NHIEM",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

BanChapHanhSchema.index({
  chiHoiId: 1,
  trangThai: 1,
});

BanChapHanhSchema.index({
  hoiVienId: 1,
  nhiemKy: 1,
});

BanChapHanhSchema.pre("validate", function () {
  if (
    this.ngayKetThuc &&
    this.ngayBatDau &&
    this.ngayKetThuc < this.ngayBatDau
  ) {
    this.invalidate(
      "ngayKetThuc",
      "Ngày kết thúc không được nhỏ hơn ngày bắt đầu",
    );
  }
});

const BanChapHanh: Model<IBanChapHanh> =
  mongoose.models.BanChapHanh ||
  mongoose.model<IBanChapHanh>(
    "BanChapHanh",
    BanChapHanhSchema,
  );

export default BanChapHanh;