import { createCanvas } from 'canvas';

interface CaptchaResult {
  image: Buffer;
  text: string;
}

export async function generateCaptcha(): Promise<CaptchaResult> {
  const width = 200;
  const height = 80;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Generate random text
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let text = '';
  for (let i = 0; i < 6; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Fill background
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, width, height);

  // Add noise
  for (let i = 0; i < 100; i++) {
    ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.1)`;
    ctx.beginPath();
    ctx.arc(
      Math.random() * width,
      Math.random() * height,
      Math.random() * 3,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Draw text
  ctx.font = 'bold 40px Arial';
  ctx.fillStyle = '#333';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Add some rotation to each character
  for (let i = 0; i < text.length; i++) {
    const x = 30 + i * 30;
    const y = height / 2;
    const rotation = (Math.random() - 0.5) * 0.3;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillText(text[i], 0, 0);
    ctx.restore();
  }

  return {
    image: canvas.toBuffer(),
    text
  };
} 