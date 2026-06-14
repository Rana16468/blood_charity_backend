import { Model } from 'mongoose';
import { USER_ROLE } from './user.constant';



export interface UserResponse {
  status: boolean;
  message: string;
}





export interface TUser {
  browsername: string;
  device: string;
  email: string;
  engine: string;
  ipaddress: string;
  isVerify: boolean;
  status: "isProgress" | "blocked"
  role:"donor" | "admin"
  name: string;
  os: string;
  picture: string;
  platform: string;
  isOnline: boolean;
  isDonorRegister:boolean;
  generate_secret_key: string
  isDelete: boolean;

}

export interface UserModel extends Model<TUser> {

  isUserExistByCustomId(id: string): Promise<TUser>;

  isPasswordMatched(
    userSendingPassword: string,
    existingPassword: string,
  ): Promise<boolean>;
  isJWTIssuesBeforePasswordChange(
    passwordChangeTimestamp: Date,
    jwtIssuesTime: number,
  ): Promise<boolean>;
}

export type TUserRole = keyof typeof USER_ROLE;
