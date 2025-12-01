export const verifyEmail =({otp, title}:{otp:number, title:string}):string =>{
    return `<!DOCTYPE html>
<html>
  <head>
    <style>
      body {
        background-color: #f3f4f6;
        margin: 0;
        font-family: Arial, sans-serif;
      }

      table {
        border-spacing: 0;
      }

      .container {
        margin: auto;
        padding: 30px;
        background-color: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        max-width: 600px;
      }

      .header {
        background: linear-gradient(135deg, #2563eb, #9333ea);
        text-align: center;
        padding: 30px 20px;
        border-radius: 12px 12px 0 0;
      }

      .header img {
        width: 80px;
        margin-bottom: 10px;
      }

      .header h1 {
        color: #ffffff;
        margin: 0;
        font-size: 22px;
      }

      .otp-box {
        display: inline-block;
        background: #f9fafb;
        padding: 15px 25px;
        font-size: 26px;
        font-weight: bold;
        color: #2563eb;
        border-radius: 10px;
        margin: 20px 0;
        letter-spacing: 5px;
      }

      .socials {
        text-align: center;
        padding: 15px;
      }

      .socials img {
        width: 40px;
        margin: 0 10px;
        transition: transform 0.3s ease;
      }

      .socials img:hover {
        transform: scale(1.1);
      }

      .footer {
        font-size: 12px;
        color: #6b7280;
        text-align: center;
        margin-top: 20px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <!-- Header -->
      <div class="header">
        <img src="https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.stickpng.com%2Fimg%2Ficons-logos-emojis%2Fsocial-media-icons%2Ftruth-social-app&psig=AOvVaw3chYU8gR-3763C61W2C1Dp&ust=1756657116991000&source=images&cd=vfe&opi=89978449&ved=0CBUQjRxqFwoTCODH1vT3so8DFQAAAAAdAAAAABAE" alt="SocialApp Logo"/>
        <h1>${title}</h1>
      </div>

      <!-- OTP -->
      <div style="text-align:center; padding: 20px;">
        <p>Please use the following OTP to continue:</p>
        <div class="otp-box">${otp}</div>
        <p>This code will expire in 10 minutes.</p>
      </div>

      <!-- Social Links -->
      <div class="socials">
          <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group35062_erj5dx.png" alt="Facebook"/>
        </a>
          <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group35063_zottpo.png" alt="Instagram"/>
        </a>
          <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group_35064_i8qtfd.png" alt="Twitter"/>
        </a>
      </div>

      <!-- Footer -->
      <div class="footer">
        © 2025 SocialApp. All rights reserved.
      </div>
    </div>
  </body>
</html>`;
}