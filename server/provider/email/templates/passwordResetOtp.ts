export default function PasswordResetOtpTemplate(otp: string) {
	return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
 <head>
  <meta charset="UTF-8">
  <meta content="width=device-width, initial-scale=1" name="viewport">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta content="telephone=no" name="format-detection">
  <title>Reset Your Password</title>
  <style type="text/css">
  body { width:100%; height:100%; padding:0; margin:0; font-family: arial, 'helvetica neue', helvetica, sans-serif; }
  .otp-code { font-size:36px; font-weight:bold; letter-spacing:12px; color:#5C68E2; text-align:center; padding:20px 0; }
  </style>
 </head>
 <body style="width:100%;height:100%;padding:0;margin:0;background-color:#FAFAFA">
  <div style="background-color:#FAFAFA">
   <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;padding:0;margin:0;width:100%;background-color:#FAFAFA">
     <tr>
      <td valign="top" style="padding:0;margin:0">
       <table cellpadding="0" cellspacing="0" align="center" style="border-collapse:collapse;width:100%">
         <tr>
          <td align="center" style="padding:0;margin:0">
           <table bgcolor="#ffffff" align="center" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background-color:transparent;width:600px">
             <tr>
              <td align="left" style="padding:20px;margin:0">
               <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse">
                 <tr>
                  <td valign="top" align="center" style="padding:0;margin:0;width:560px">
                   <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse">
                     <tr>
                      <td align="center" style="padding:0;margin:0;padding-bottom:10px;font-size:0px"><img src="https://getmyguide.in/images/logo.png" alt="Logo" style="display:block;font-size:12px;border:0;outline:none;text-decoration:none" width="200"></td>
                     </tr>
                   </table></td>
                 </tr>
               </table></td>
             </tr>
           </table></td>
         </tr>
       </table>
       <table cellpadding="0" cellspacing="0" align="center" style="border-collapse:collapse;width:100%">
         <tr>
          <td align="center" style="padding:0;margin:0">
           <table bgcolor="#ffffff" align="center" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background-color:#FFFFFF;width:600px">
             <tr>
              <td align="left" style="padding:15px 20px 0 20px;margin:0">
               <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse">
                 <tr>
                  <td align="center" valign="top" style="padding:0;margin:0;width:560px">
                   <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse">
                     <tr>
                      <td align="center" style="margin:0;padding:15px 40px"><h1 style="margin:0;font-family:arial, 'helvetica neue', helvetica, sans-serif;font-size:40px;font-weight:bold;line-height:48px;color:#333333">Reset Your Password</h1></td>
                     </tr>
                     <tr>
                      <td align="center" style="padding:10px 0 0 0;margin:0"><p style="margin:0;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:21px;color:#333333;font-size:14px">Use the following code to reset your password:</p></td>
                     </tr>
                     <tr>
                      <td align="center" style="padding:25px 0;margin:0">
                       <div style="font-size:36px;font-weight:bold;letter-spacing:12px;color:#5C68E2;text-align:center;padding:15px 20px;background-color:#F4F4FD;border-radius:8px;display:inline-block">${otp}</div>
                      </td>
                     </tr>
                   </table></td>
                 </tr>
               </table></td>
             </tr>
             <tr>
              <td align="left" style="padding:0 20px 20px 20px;margin:0">
               <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse">
                 <tr>
                  <td align="center" valign="top" style="padding:0;margin:0;width:560px">
                   <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border-radius:5px">
                     <tr>
                      <td align="center" style="padding:0;margin:0;padding-top:10px"><h3 style="margin:0;font-family:arial, 'helvetica neue', helvetica, sans-serif;font-size:20px;font-weight:bold;line-height:30px;color:#333333">This code expires in 10 minutes.</h3></td>
                     </tr>
                     <tr>
                      <td align="center" style="padding:10px 0;margin:0"><p style="margin:0;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:21px;color:#333333;font-size:14px">If you didn't request a password reset, please ignore this email or contact support immediately.</p></td>
                     </tr>
                   </table></td>
                 </tr>
               </table></td>
             </tr>
           </table></td>
         </tr>
       </table>
       <table cellpadding="0" cellspacing="0" align="center" style="border-collapse:collapse;width:100%;background-color:transparent">
         <tr>
          <td align="center" style="padding:0;margin:0">
           <table align="center" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background-color:transparent;width:600px">
             <tr>
              <td align="left" style="margin:0;padding:20px">
               <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse">
                 <tr>
                  <td align="left" style="padding:0;margin:0;width:560px">
                   <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse">
                     <tr>
                      <td align="center" style="padding:15px 0"><p style="margin:0;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:18px;color:#333333;font-size:12px">Get My Guide &copy; ${new Date().getFullYear()} Get My Guide. All Rights Reserved.</p></td>
                     </tr>
                   </table></td>
                 </tr>
               </table></td>
             </tr>
           </table></td>
         </tr>
       </table>
      </td>
     </tr>
   </table>
  </div>
 </body>
</html>`;
}
