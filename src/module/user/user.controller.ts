import { RequestHandler } from 'express';
import catchAsync from '../../utility/catchAsync';


import httpStatus from 'http-status';
import { UserServices } from './user.services';
import config from '../../app/config';
import sendResponse from '../../utility/sendRespone';


const createUser: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.socialMediaAuthIntoDb(req.body);
   const { refreshToken, accessToken } = result;
  res.cookie('refreshToken', refreshToken, {
    secure: config.NODE_ENV === 'production',
    httpOnly: true,
  });
  sendResponse(res, {
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
