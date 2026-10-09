import mongoose, {
  Schema,
  Model,
  models,
  Types,
} from "mongoose";

export type UserRole =
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | "HOI_VIEN";

export interface IUser {
  username: string;

  password: string;

  fullName: string;

  email?: string;

  phone?: string;

  role: UserRole;

  chiHoiId?:
    | Types.ObjectId
    | null;

  isActive: boolean;

  failedLoginAttempts: number;

  lockUntil?:
    | Date
    | null;

  lastFailedLoginAt?:
    | Date
    | null;

  lastLoginAt?:
    | Date
    | null;

  createdAt?: Date;

  updatedAt?: Date;
}

const UserSchema =
  new Schema<IUser>(
    {
      username: {
        type: String,
        required: [
          true,
          "Tên đăng nhập không được để trống",
        ],
        unique: true,
        trim: true,
        lowercase: true,
      },

      password: {
        type: String,
        required: [
          true,
          "Mật khẩu không được để trống",
        ],
      },

      fullName: {
        type: String,
        required: [
          true,
          "Họ tên không được để trống",
        ],
        trim: true,
      },

      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: "",
      },

      phone: {
        type: String,
        trim: true,
        default: "",
      },

      role: {
        type: String,
        enum: [
          "ADMIN",
          "BAN_CHAP_HANH",
          "CHI_HOI_TRUONG",
          "HOI_VIEN",
        ],
        required: [
          true,
          "Vai trò không được để trống",
        ],
      },

      chiHoiId: {
        type:
          Schema.Types.ObjectId,
        ref:
          "ChiHoi",
        default:
          null,
      },

      isActive: {
        type: Boolean,
        default: true,
      },

      failedLoginAttempts: {
        type: Number,
        default: 0,
        min: 0,
      },

      lockUntil: {
        type: Date,
        default: null,
      },

      lastFailedLoginAt: {
        type: Date,
        default: null,
      },

      lastLoginAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    },
  );

/*
 * Tăng tốc kiểm tra tài khoản bị khóa.
 */
UserSchema.index({
  lockUntil: 1,
});

const User:
  Model<IUser> =
  (
    models.User as
      Model<IUser>
  ) ||
  mongoose.model<IUser>(
    "User",
    UserSchema,
  );

export default User;