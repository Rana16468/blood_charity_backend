import { RequestHandler } from 'express';
import catchAsync from '../../utility/catchAsync';

import sendRespone from '../../utility/sendRespone';
import httpStatus from 'http-status';
import { UserServices } from './user.services';
import config from '../../app/config';

const createUser: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.socialMediaAuthIntoDb(req.body);
   const { refreshToken, accessToken } = result;
  res.cookie('refreshToken', refreshToken, {
    secure: config.NODE_ENV === 'production',
    httpOnly: true,
  });
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully Login',
    data: { accessToken },
  });
});

const UserController = {
  createUser,

};

export default UserController;
