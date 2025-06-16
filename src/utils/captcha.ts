import { createCanvas, registerFont } from 'canvas';

// Register FreeSans font for Docker/Alpine compatibility
registerFont('/usr/share/fonts/freefont/FreeSans.otf', { family: 'FreeSans' });

export interface CaptchaResult {
  image: Buffer;
  text: string;
}

export async function generateCaptcha(): Promise<CaptchaResult> {
  const width = 320;
  const height = 120;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fill background with white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Generate random text
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let text = '';
  for (let i = 0; i < 6; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  console.log('Generated captcha text:', text); // Debug log

  // Draw text with improved visibility
  ctx.font = 'bold 48px FreeSans';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Draw each character with a slight rotation and shadow
  for (let i = 0; i < text.length; i++) {
    const x = 60 + i * 45;
    const y = height / 2;
    
    // Add shadow for better visibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Random rotation between -15 and 15 degrees
    const rotation = (Math.random() - 0.5) * 30;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.fillText(text[i], 0, 0);
    ctx.restore();
  }

  // Add some noise lines
  ctx.strokeStyle = '#e8eef7';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * 20);
    ctx.lineTo(width, i * 20);
    ctx.stroke();
  }

  // Add some random dots for additional noise
  ctx.fillStyle = '#e8eef7';
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Debug: Save the image to a file to verify it's being generated correctly
  const fs = require('fs');
  const buffer = canvas.toBuffer('image/png');
  // fs.writeFileSync('debug-captcha.png', buffer);
  // console.log('Debug image saved as debug-captcha.png');

  return {
    image: buffer,
    text
  };
}