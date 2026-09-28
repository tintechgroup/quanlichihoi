import mongoose, {
  Schema,
  Model,
  models,
  Types,
} from "mongoose";

// Khai báo 4 vai trò trong hệ thống
export type UserRole =
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | "HOI_VIEN";

// Kiểu dữ liệu của một tài khoản
export interface IUser {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: UserRole;
  chiHoiId?: Types.ObjectId | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Cấu trúc tài khoản trong MongoDB
const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, "Tên đăng nhập không được để trống"],
      unique: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: [true, "Mật khẩu không được để trống"],
    },

    fullName: {
      type: String,
      required: [true, "Họ tên không được để trống"],
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
      required: [true, "Vai trò không được để trống"],
    },

    chiHoiId: {
      type: Schema.Types.ObjectId,
      ref: "ChiHoi",
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Tránh tạo lại model khi Next.js tự động reload
const User: Model<IUser> =
  (models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);

export default User;