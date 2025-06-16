import { generateCaptcha } from './utils/captcha';
import * as fs from 'fs';
import * as path from 'path';

async function testCaptcha() {
  try {
    const result = await generateCaptcha();
    console.log('Generated CAPTCHA text:', result.text);
    
    // Save the image with explicit PNG format
    const outputPath = path.join(process.cwd(), `captcha-test_${result.text}.png`);
    fs.writeFileSync(outputPath, result.image);
    console.log('CAPTCHA image saved as:', outputPath);
  } catch (error) {
    console.error('Error generating CAPTCHA:', error);
  }
}

testCaptcha(); 