import mongoose, {
  Model,
  Schema,
  Types,
} from "mongoose";

/* =========================================================
   TYPES
========================================================= */

export type LoaiThongBao =
  | "THONG_BAO_CHUNG"
  | "HOAT_DONG"
  | "TAI_LIEU"
  | "KHAC";

export type MucDoThongBao =
  | "THONG_THUONG"
  | "QUAN_TRONG"
  | "KHAN_CAP";

export type PhamViThongBao =
  | "TAT_CA"
  | "CHI_HOI"
  | "VAI_TRO"
  | "CA_NHAN";

export type TrangThaiThongBao =
  | "NHAP"
  | "CHO_DUYET"
  | "DA_DANG"
  | "TU_CHOI"
  | "DA_AN";

export type VaiTroNhanThongBao =
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | "HOI_VIEN";

/* =========================================================
   ATTACHMENT
========================================================= */

export interface ITepDinhKem {
  tenTep: string;

  duongDan: string;

  loaiTep?: string;

  kichThuoc?: number;
}

/* =========================================================
   INTERFACE
========================================================= */

export interface IThongBao {
  maThongBao: string;

  tieuDe: string;

  noiDung: string;

  loaiThongBao:
    LoaiThongBao;

  mucDo:
    MucDoThongBao;

  phamVi:
    PhamViThongBao;

  chiHoiIds:
    Types.ObjectId[];

  vaiTroNguoiNhan:
    VaiTroNhanThongBao[];

  nguoiNhanIds:
    Types.ObjectId[];

  tepDinhKem:
    ITepDinhKem[];

  ngayBatDau?:
    Date;

  ngayKetThuc?:
    Date;

  trangThai:
    TrangThaiThongBao;

  nguoiTaoId:
    Types.ObjectId;

  /* =====================================================
     APPROVAL
  ===================================================== */

  nguoiDuyetId?:
    Types.ObjectId | null;

  ngayGuiDuyet?:
    Date | null;

  ngayDuyet?:
    Date | null;

  lyDoTuChoi?:
    string;

  /* =====================================================
     READ STATUS
  ===================================================== */

  nguoiDaDocIds:
    Types.ObjectId[];

  soLuotXem:
    number;

  createdAt:
    Date;

  updatedAt:
    Date;
}

/* =========================================================
   ATTACHMENT SCHEMA
========================================================= */

const TepDinhKemSchema =
  new Schema<ITepDinhKem>(
    {
      tenTep: {
        type:
          String,

        required: [
          true,
          "Tên tệp đính kèm không được để trống",
        ],

        trim:
          true,

        maxlength: [
          255,
          "Tên tệp không được vượt quá 255 ký tự",
        ],
      },

      duongDan: {
        type:
          String,

        required: [
          true,
          "Đường dẫn tệp không được để trống",
        ],

        trim:
          true,

        maxlength: [
          2000,
          "Đường dẫn tệp không được vượt quá 2000 ký tự",
        ],
      },

      loaiTep: {
        type:
          String,

        trim:
          true,

        maxlength: [
          150,
          "Loại tệp không được vượt quá 150 ký tự",
        ],

        default:
          undefined,
      },

      kichThuoc: {
        type:
          Number,

        min: [
          0,
          "Kích thước tệp không được nhỏ hơn 0",
        ],

        max: [
          10 *
            1024 *
            1024,
          "Kích thước tệp không được vượt quá 10 MB",
        ],

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
   MAIN SCHEMA
========================================================= */

const ThongBaoSchema =
  new Schema<IThongBao>(
    {
      maThongBao: {
        type:
          String,

        required: [
          true,
          "Mã thông báo không được để trống",
        ],

        trim:
          true,

        uppercase:
          true,

        maxlength: [
          60,
          "Mã thông báo không được vượt quá 60 ký tự",
        ],
      },

      tieuDe: {
        type:
          String,

        required: [
          true,
          "Tiêu đề thông báo không được để trống",
        ],

        trim:
          true,

        maxlength: [
          250,
          "Tiêu đề thông báo không được vượt quá 250 ký tự",
        ],
      },

      noiDung: {
        type:
          String,

        required: [
          true,
          "Nội dung thông báo không được để trống",
        ],

        trim:
          true,

        maxlength: [
          20000,
          "Nội dung thông báo không được vượt quá 20000 ký tự",
        ],
      },

      loaiThongBao: {
        type:
          String,

        required:
          true,

        enum: {
          values: [
            "THONG_BAO_CHUNG",
            "HOAT_DONG",
            "TAI_LIEU",
            "KHAC",
          ],

          message:
            "Loại thông báo không hợp lệ",
        },

        default:
          "THONG_BAO_CHUNG",
      },

      mucDo: {
        type:
          String,

        required:
          true,

        enum: {
          values: [
            "THONG_THUONG",
            "QUAN_TRONG",
            "KHAN_CAP",
          ],

          message:
            "Mức độ thông báo không hợp lệ",
        },

        default:
          "THONG_THUONG",
      },

      phamVi: {
        type:
          String,

        required:
          true,

        enum: {
          values: [
            "TAT_CA",
            "CHI_HOI",
            "VAI_TRO",
            "CA_NHAN",
          ],

          message:
            "Phạm vi nhận thông báo không hợp lệ",
        },

        default:
          "TAT_CA",
      },

      chiHoiIds: {
        type: [
          {
            type:
              Schema.Types
                .ObjectId,

            ref:
              "ChiHoi",
          },
        ],

        default:
          [],
      },

      vaiTroNguoiNhan: {
        type: [
          {
            type:
              String,

            enum: [
              "ADMIN",
              "BAN_CHAP_HANH",
              "CHI_HOI_TRUONG",
              "HOI_VIEN",
            ],
          },
        ],

        default:
          [],
      },

      nguoiNhanIds: {
        type: [
          {
            type:
              Schema.Types
                .ObjectId,

            ref:
              "User",
          },
        ],

        default:
          [],
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
              ITepDinhKem[],
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

      ngayBatDau: {
        type:
          Date,

        default:
          undefined,
      },

      ngayKetThuc: {
        type:
          Date,

        default:
          undefined,
      },

      /* =====================================================
         STATUS
      ===================================================== */

      trangThai: {
        type:
          String,

        required:
          true,

        enum: {
          values: [
            "NHAP",
            "CHO_DUYET",
            "DA_DANG",
            "TU_CHOI",
            "DA_AN",
          ],

          message:
            "Trạng thái thông báo không hợp lệ",
        },

        /*
         * Không phát hành mặc định.
         *
         * Điều này giúp tránh record được tạo
         * ngoài API vô tình public.
         */
        default:
          "NHAP",
      },

      /* =====================================================
         CREATOR
      ===================================================== */

      nguoiTaoId: {
        type:
          Schema.Types
            .ObjectId,

        ref:
          "User",

        required: [
          true,
          "Không xác định được người tạo thông báo",
        ],

        index:
          true,
      },

      /* =====================================================
         APPROVAL
      ===================================================== */

      nguoiDuyetId: {
        type:
          Schema.Types
            .ObjectId,

        ref:
          "User",

        default:
          null,

        index:
          true,
      },

      ngayGuiDuyet: {
        type:
          Date,

        default:
          null,
      },

      ngayDuyet: {
        type:
          Date,

        default:
          null,
      },

      lyDoTuChoi: {
        type:
          String,

        trim:
          true,

        maxlength: [
          1000,
          "Lý do từ chối không được vượt quá 1000 ký tự",
        ],

        default:
          "",
      },

      /* =====================================================
         READ
      ===================================================== */

      nguoiDaDocIds: {
        type: [
          {
            type:
              Schema.Types
                .ObjectId,

            ref:
              "User",
          },
        ],

        default:
          [],
      },

      soLuotXem: {
        type:
          Number,

        default:
          0,

        min: [
          0,
          "Số lượt xem không được nhỏ hơn 0",
        ],
      },
    },
    {
      timestamps:
        true,

      collection:
        "thong_bao",

      toJSON: {
        virtuals:
          true,

        versionKey:
          false,

        transform(
          _document,
          returnedObject,
        ) {
          if (
            returnedObject._id
          ) {
            Object.assign(
              returnedObject,
              {
                id:
                  returnedObject._id.toString(),
              },
            );
          }

          return returnedObject;
        },
      },

      toObject: {
        virtuals:
          true,

        versionKey:
          false,
      },
    },
  );

/* =========================================================
   VALIDATION
========================================================= */

ThongBaoSchema.pre(
  "validate",
  function () {
    /* =====================================================
       DATE
    ===================================================== */

    if (
      this.ngayBatDau &&
      this.ngayKetThuc &&
      this.ngayKetThuc.getTime() <=
        this.ngayBatDau.getTime()
    ) {
      this.invalidate(
        "ngayKetThuc",
        "Thời gian kết thúc phải sau thời gian bắt đầu",
      );
    }

    /* =====================================================
       CHI HOI
    ===================================================== */

    if (
      this.phamVi ===
        "CHI_HOI" &&
      (
        !Array.isArray(
          this.chiHoiIds,
        ) ||
        this.chiHoiIds.length ===
          0
      )
    ) {
      this.invalidate(
        "chiHoiIds",
        "Vui lòng chọn ít nhất một Chi hội",
      );
    }

    /* =====================================================
       ROLE
    ===================================================== */

    if (
      this.phamVi ===
        "VAI_TRO" &&
      (
        !Array.isArray(
          this.vaiTroNguoiNhan,
        ) ||
        this.vaiTroNguoiNhan
          .length ===
          0
      )
    ) {
      this.invalidate(
        "vaiTroNguoiNhan",
        "Vui lòng chọn ít nhất một vai trò người nhận",
      );
    }

    /* =====================================================
       PERSONAL
    ===================================================== */

    if (
      this.phamVi ===
        "CA_NHAN" &&
      (
        !Array.isArray(
          this.nguoiNhanIds,
        ) ||
        this.nguoiNhanIds
          .length ===
          0
      )
    ) {
      this.invalidate(
        "nguoiNhanIds",
        "Vui lòng chọn ít nhất một người nhận",
      );
    }

    /* =====================================================
       REJECT
    ===================================================== */

    if (
      this.trangThai ===
        "TU_CHOI" &&
      !this.lyDoTuChoi?.trim()
    ) {
      this.invalidate(
        "lyDoTuChoi",
        "Vui lòng nhập lý do từ chối thông báo",
      );
    }

    /* =====================================================
       CLEAN UNUSED TARGETS
    ===================================================== */

    if (
      this.phamVi !==
      "CHI_HOI"
    ) {
      this.chiHoiIds =
        [];
    }

    if (
      this.phamVi !==
      "VAI_TRO"
    ) {
      this.vaiTroNguoiNhan =
        [];
    }

    if (
      this.phamVi !==
      "CA_NHAN"
    ) {
      this.nguoiNhanIds =
        [];
    }
  },
);

/* =========================================================
   INDEXES
========================================================= */

ThongBaoSchema.index(
  {
    maThongBao:
      1,
  },
  {
    name:
      "maThongBao_1",

    unique:
      true,

    partialFilterExpression:
      {
        maThongBao: {
          $type:
            "string",
        },
      },
  },
);

ThongBaoSchema.index({
  trangThai:
    1,

  createdAt:
    -1,
});

ThongBaoSchema.index({
  nguoiTaoId:
    1,

  trangThai:
    1,

  createdAt:
    -1,
});

ThongBaoSchema.index({
  nguoiDuyetId:
    1,

  trangThai:
    1,
});

ThongBaoSchema.index({
  loaiThongBao:
    1,

  mucDo:
    1,

  createdAt:
    -1,
});

ThongBaoSchema.index({
  phamVi:
    1,

  trangThai:
    1,
});

ThongBaoSchema.index({
  chiHoiIds:
    1,

  trangThai:
    1,
});

ThongBaoSchema.index({
  vaiTroNguoiNhan:
    1,

  trangThai:
    1,
});

ThongBaoSchema.index({
  nguoiNhanIds:
    1,

  trangThai:
    1,
});

ThongBaoSchema.index({
  ngayBatDau:
    1,

  ngayKetThuc:
    1,
});

ThongBaoSchema.index({
  nguoiDaDocIds:
    1,
});

/* =========================================================
   MODEL
========================================================= */

const ThongBao:
  Model<IThongBao> =
  (mongoose.models
    .ThongBao as
    Model<IThongBao>) ||
  mongoose.model<IThongBao>(
    "ThongBao",
    ThongBaoSchema,
  );

export default ThongBao;