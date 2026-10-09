import mongoose, {
  Schema,
  Model,
  models,
  Types,
} from "mongoose";

export type LoaiYeuCauHoTro =
  | "TAI_KHOAN"
  | "HOI_VIEN"
  | "HOAT_DONG"
  | "HOI_PHI"
  | "TAI_CHINH"
  | "VAN_KIEN"
  | "KHAC";

export type MucDoUuTien =
  | "THAP"
  | "TRUNG_BINH"
  | "CAO";

export type TrangThaiHoTro =
  | "MOI"
  | "DA_TIEP_NHAN"
  | "DANG_XU_LY"
  | "CHO_BO_SUNG"
  | "DA_XU_LY"
  | "DONG";

export type VaiTroNguoiGui =
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | "HOI_VIEN";

export type HanhDongXuLy =
  | "TAO_YEU_CAU"
  | "TIEP_NHAN"
  | "PHAN_HOI"
  | "CAP_NHAT_TRANG_THAI"
  | "DONG_YEU_CAU"
  | "MO_LAI";

export interface ITepDinhKemHoTro {
  tenTep:
    string;

  duongDan:
    string;

  pathname?:
    string;

  mimeType?:
    string;

  kichThuoc?:
    number;
}

export interface IPhanHoiHoTro {
  nguoiGuiId:
    Types.ObjectId;

  nguoiGuiTen:
    string;

  vaiTro:
    VaiTroNguoiGui;

  noiDung:
    string;

  createdAt:
    Date;
}

export interface ILichSuXuLyHoTro {
  nguoiThucHienId:
    Types.ObjectId;

  nguoiThucHienTen:
    string;

  vaiTro:
    VaiTroNguoiGui;

  hanhDong:
    HanhDongXuLy;

  trangThaiCu?:
    TrangThaiHoTro | null;

  trangThaiMoi?:
    TrangThaiHoTro | null;

  ghiChu?:
    string;

  createdAt:
    Date;
}

export interface IYeuCauHoTro {
  maYeuCau:
    string;

  tieuDe:
    string;

  noiDung:
    string;

  loai:
    LoaiYeuCauHoTro;

  mucDo:
    MucDoUuTien;

  trangThai:
    TrangThaiHoTro;

  nguoiGuiId:
    Types.ObjectId;

  nguoiGuiTen:
    string;

  nguoiGuiVaiTro:
    VaiTroNguoiGui;

  chiHoiId?:
    Types.ObjectId | null;

  nguoiXuLyId?:
    Types.ObjectId | null;

  nguoiXuLyTen?:
    string;

  tepDinhKem:
    ITepDinhKemHoTro[];

  phanHoi:
    IPhanHoiHoTro[];

  lichSuXuLy:
    ILichSuXuLyHoTro[];

  thoiGianTiepNhan?:
    Date | null;

  thoiGianXuLyXong?:
    Date | null;

  thoiGianDong?:
    Date | null;

  createdAt?:
    Date;

  updatedAt?:
    Date;
}

/* =========================================================
   FILE
========================================================= */

const TepDinhKemSchema =
  new Schema<ITepDinhKemHoTro>(
    {
      tenTep: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          500,
      },

      duongDan: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },

      pathname: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      mimeType: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      kichThuoc: {
        type:
          Number,

        min:
          0,

        default:
          0,
      },
    },
    {
      _id:
        false,
    },
  );

/* =========================================================
   REPLY
========================================================= */

const PhanHoiSchema =
  new Schema<IPhanHoiHoTro>(
    {
      nguoiGuiId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        required:
          true,
      },

      nguoiGuiTen: {
        type:
          String,

        required:
          true,

        trim:
          true,
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
      },

      noiDung: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          3000,
      },

      createdAt: {
        type:
          Date,

        default:
          Date.now,
      },
    },
    {
      _id:
        true,
    },
  );

/* =========================================================
   HISTORY
========================================================= */

const LichSuXuLySchema =
  new Schema<ILichSuXuLyHoTro>(
    {
      nguoiThucHienId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        required:
          true,
      },

      nguoiThucHienTen: {
        type:
          String,

        required:
          true,

        trim:
          true,
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
      },

      hanhDong: {
        type:
          String,

        enum: [
          "TAO_YEU_CAU",
          "TIEP_NHAN",
          "PHAN_HOI",
          "CAP_NHAT_TRANG_THAI",
          "DONG_YEU_CAU",
          "MO_LAI",
        ],

        required:
          true,
      },

      trangThaiCu: {
        type:
          String,

        enum: [
          "MOI",
          "DA_TIEP_NHAN",
          "DANG_XU_LY",
          "CHO_BO_SUNG",
          "DA_XU_LY",
          "DONG",
        ],

        default:
          null,
      },

      trangThaiMoi: {
        type:
          String,

        enum: [
          "MOI",
          "DA_TIEP_NHAN",
          "DANG_XU_LY",
          "CHO_BO_SUNG",
          "DA_XU_LY",
          "DONG",
        ],

        default:
          null,
      },

      ghiChu: {
        type:
          String,

        trim:
          true,

        maxlength:
          1000,

        default:
          "",
      },

      createdAt: {
        type:
          Date,

        default:
          Date.now,
      },
    },
    {
      _id:
        true,
    },
  );

/* =========================================================
   MAIN
========================================================= */

const YeuCauHoTroSchema =
  new Schema<IYeuCauHoTro>(
    {
      maYeuCau: {
        type:
          String,

        required:
          true,

        unique:
          true,

        index:
          true,
      },

      tieuDe: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          255,
      },

      noiDung: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          5000,
      },

      loai: {
        type:
          String,

        enum: [
          "TAI_KHOAN",
          "HOI_VIEN",
          "HOAT_DONG",
          "HOI_PHI",
          "TAI_CHINH",
          "VAN_KIEN",
          "KHAC",
        ],

        required:
          true,
      },

      mucDo: {
        type:
          String,

        enum: [
          "THAP",
          "TRUNG_BINH",
          "CAO",
        ],

        default:
          "TRUNG_BINH",
      },

      trangThai: {
        type:
          String,

        enum: [
          "MOI",
          "DA_TIEP_NHAN",
          "DANG_XU_LY",
          "CHO_BO_SUNG",
          "DA_XU_LY",
          "DONG",
        ],

        default:
          "MOI",

        index:
          true,
      },

      nguoiGuiId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        required:
          true,

        index:
          true,
      },

      nguoiGuiTen: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },

      nguoiGuiVaiTro: {
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
      },

      chiHoiId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "ChiHoi",

        default:
          null,
      },

      nguoiXuLyId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      nguoiXuLyTen: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      tepDinhKem: {
        type: [
          TepDinhKemSchema,
        ],

        default:
          [],

        validate: {
          validator(
            value:
              ITepDinhKemHoTro[],
          ) {
            return (
              Array.isArray(
                value,
              ) &&
              value.length <=
                5
            );
          },

          message:
            "Chỉ được đính kèm tối đa 5 tệp",
        },
      },

      phanHoi: {
        type: [
          PhanHoiSchema,
        ],

        default:
          [],
      },

      lichSuXuLy: {
        type: [
          LichSuXuLySchema,
        ],

        default:
          [],
      },

      thoiGianTiepNhan: {
        type:
          Date,

        default:
          null,
      },

      thoiGianXuLyXong: {
        type:
          Date,

        default:
          null,
      },

      thoiGianDong: {
        type:
          Date,

        default:
          null,
      },
    },
    {
      timestamps:
        true,
    },
  );

YeuCauHoTroSchema.index({
  createdAt:
    -1,
});

YeuCauHoTroSchema.index({
  trangThai:
    1,

  createdAt:
    -1,
});

YeuCauHoTroSchema.index({
  nguoiGuiId:
    1,

  createdAt:
    -1,
});

const YeuCauHoTro:
  Model<IYeuCauHoTro> =
  (
    models.YeuCauHoTro as
      Model<IYeuCauHoTro>
  ) ||
  mongoose.model<IYeuCauHoTro>(
    "YeuCauHoTro",

    YeuCauHoTroSchema,
  );

export default YeuCauHoTro;