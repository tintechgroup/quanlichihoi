import mongoose, {
  Model,
  Schema,
  Types,
} from "mongoose";

export type TrangThaiDeXuatHoiVien =
  | "CHO_XU_LY"
  | "DA_PHE_DUYET"
  | "TU_CHOI";

export type GioiTinhDeXuat =
  | "NAM"
  | "NU"
  | "KHAC";

export interface IDeXuatHoiVien {
  maHoiVien: string;

  hoTen: string;

  ngaySinh?: Date;

  gioiTinh?: GioiTinhDeXuat;

  email?: string;

  soDienThoai?: string;

  lop?: string;

  khoaHoc?: string;

  diaChi?: string;

  chiHoiId: Types.ObjectId;

  trangThaiHoiVien:
    | "DANG_HOAT_DONG"
    | "TAM_NGUNG";

  trangThai: TrangThaiDeXuatHoiVien;

  nguoiDeXuatId: Types.ObjectId;

  nguoiDeXuatTen: string;

  nguoiXuLyId?: Types.ObjectId | null;

  nguoiXuLyTen?: string;

  lyDoTuChoi?: string;

  ngayXuLy?: Date | null;

  hoiVienDaTaoId?: Types.ObjectId | null;

  createdAt: Date;

  updatedAt: Date;
}

const DeXuatHoiVienSchema =
  new Schema<IDeXuatHoiVien>(
    {
      maHoiVien: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        maxlength: 30,
        index: true,
      },

      hoTen: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
      },

      ngaySinh: {
        type: Date,
        default: undefined,
      },

      gioiTinh: {
        type: String,
        enum: [
          "NAM",
          "NU",
          "KHAC",
        ],
        default: undefined,
      },

      email: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 150,
        default: undefined,
      },

      soDienThoai: {
        type: String,
        trim: true,
        maxlength: 15,
        default: undefined,
      },

      lop: {
        type: String,
        trim: true,
        maxlength: 100,
        default: undefined,
      },

      khoaHoc: {
        type: String,
        trim: true,
        maxlength: 50,
        default: undefined,
      },

      diaChi: {
        type: String,
        trim: true,
        maxlength: 300,
        default: undefined,
      },

      chiHoiId: {
        type:
          Schema.Types.ObjectId,

        ref: "ChiHoi",

        required: true,

        index: true,
      },

      trangThaiHoiVien: {
        type: String,

        enum: [
          "DANG_HOAT_DONG",
          "TAM_NGUNG",
        ],

        default:
          "DANG_HOAT_DONG",
      },

      trangThai: {
        type: String,

        enum: [
          "CHO_XU_LY",
          "DA_PHE_DUYET",
          "TU_CHOI",
        ],

        default:
          "CHO_XU_LY",

        index: true,
      },

      nguoiDeXuatId: {
        type:
          Schema.Types.ObjectId,

        ref: "User",

        required: true,

        index: true,
      },

      nguoiDeXuatTen: {
        type: String,

        required: true,

        trim: true,
      },

      nguoiXuLyId: {
        type:
          Schema.Types.ObjectId,

        ref: "User",

        default: null,
      },

      nguoiXuLyTen: {
        type: String,

        trim: true,

        default: "",
      },

      lyDoTuChoi: {
        type: String,

        trim: true,

        maxlength: 1000,

        default: "",
      },

      ngayXuLy: {
        type: Date,

        default: null,
      },

      hoiVienDaTaoId: {
        type:
          Schema.Types.ObjectId,

        ref: "HoiVien",

        default: null,
      },
    },
    {
      timestamps: true,

      collection:
        "de_xuat_hoi_vien",

      versionKey: false,
    },
  );

DeXuatHoiVienSchema.index({
  chiHoiId: 1,
  trangThai: 1,
  createdAt: -1,
});

DeXuatHoiVienSchema.index({
  nguoiDeXuatId: 1,
  createdAt: -1,
});

const DeXuatHoiVien: Model<IDeXuatHoiVien> =
  mongoose.models
    .DeXuatHoiVien ||
  mongoose.model<IDeXuatHoiVien>(
    "DeXuatHoiVien",
    DeXuatHoiVienSchema,
  );

export default DeXuatHoiVien;