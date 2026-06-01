const emailcontext = {
    sendvarificationData: (username: string, otp: number, subject:string) => {
      return `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${subject}</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  color: #333333;
                  max-width: 600px;
                  margin: 0 auto;
                }
                .container {
                  padding: 20px;
                  border-radius: 5px;
                  background-color: #f9f9f9;
                  border: 1px solid #dddddd;
                }
                .header {
                  text-align: center;
                  padding: 10px;
                  background-color: #4CAF50;
                  color: white;
                  border-radius: 5px 5px 0 0;
                }
                .content {
                  padding: 20px;
                  background-color: white;
                  border-radius: 0 0 5px 5px;
                }
                .otp-code {
                  font-size: 24px;
                  font-weight: bold;
                  text-align: center;
                  letter-spacing: 5px;
                  padding: 10px;
                  margin: 20px 0;
                  background-color: #f0f0f0;
                  border-radius: 4px;
                }
                .footer {
                  font-size: 12px;
                  text-align: center;
                  margin-top: 20px;
                  color: #666666;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2>Email Verification</h2>
                </div>
                <div class="content">
                  <p>Hello ${username || 'User'},</p>
                  <p>Thank you for registering with our service. To complete your registration, please use the verification code below:</p>
                  
                  <div class="otp-code">${otp}</div>
                  
                  <p>This code will expire in 10 minutes for security reasons.</p>
                  <p>If you did not request this code, please ignore this email.</p>
                  <p>Best regards,<br>The Support Team</p>
                </div>
                <div class="footer">
                  <p>This is an automated message, please do not reply to this email.</p>
                  <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
            `;
    },
  };

  
  
  export default emailcontext;