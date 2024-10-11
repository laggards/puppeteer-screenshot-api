import express from 'express';
import puppeteer, { KnownDevices } from 'puppeteer'; // 使用 KnownDevices
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const app = express();
const port = 3000;

// 配置 AWS S3 客户端
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const bucketName = process.env.S3_BUCKET_NAME;
const s3Domain = process.env.S3_DOMAIN;

// 获取当前年月
const getCurrentYearMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}/${month}`;
};

// 常见的屏幕比例
const screenRatios = [
    { width: 1920, height: 1080, ratio: 16 / 9 },
    { width: 1280, height: 720, ratio: 16 / 9 },
    { width: 1600, height: 900, ratio: 16 / 9 },
    { width: 1024, height: 768, ratio: 4 / 3 },
    { width: 800, height: 600, ratio: 4 / 3 },
    { width: 1440, height: 960, ratio: 3 / 2 },
    { width: 2160, height: 1440, ratio: 3 / 2 },
    { width: 2560, height: 1080, ratio: 21 / 9 },
    { width: 3440, height: 1440, ratio: 21 / 9 },
];

// 根据给定的宽高确定最接近的屏幕比例
const getClosestScreenSize = (targetWidth, targetHeight) => {
    const targetRatio = targetWidth / targetHeight;
    let closest = screenRatios[0];
    let minDifference = Math.abs(targetRatio - closest.ratio);

    for (const screen of screenRatios) {
        const ratioDifference = Math.abs(targetRatio - screen.ratio);
        if (ratioDifference < minDifference) {
            minDifference = ratioDifference;
            closest = screen;
        }
    }

    return { width: closest.width, height: closest.height };
};

// 截图 API
app.get('/screenshot', async (req, res) => {
    const { url, targetWidth = 1920, targetHeight = 1080, format = 'png', fullscreen = 'false', device } = req.query;

    const validFormats = ['png', 'jpg', 'jpeg', 'webp'];
    const screenshotFormat = validFormats.includes(format.toLowerCase()) ? format.toLowerCase() : 'png';

    if (!url) {
        return res.status(400).json({
            status: 'error',
            message: 'URL is required',
        });
    }

    // 验证 device 参数
    if (device &&  !KnownDevices.hasOwnProperty(device)) {
        return res.status(400).json({
            status: 'error',
            message: `Device '${device}' is not supported. Supported devices are: ${Object.keys(KnownDevices).join(', ')}`,
        });
    }

    try {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();

        // 如果指定了设备参数，模拟移动设备
        if (device) {
            const mobileDevice = KnownDevices[device]; // 使用 KnownDevices
            await page.emulate(mobileDevice);
        } else {
            let width, height;

            // 如果 fullscreen 参数为 true，则获取整个页面高度
            if (fullscreen.toLowerCase() === 'true') {
                const bodyHandle = await page.$('body');
                const bodyBox = await bodyHandle.boundingBox();
                width = targetWidth;
                height = Math.ceil(bodyBox.height);
            } else {
                // 根据给定的宽高，选择最接近的屏幕比例
                const screenSize = getClosestScreenSize(targetWidth, targetHeight);
                width = screenSize.width;
                height = screenSize.height;
            }

            // 设置视窗大小
            await page.setViewport({ width, height });
        }

        await page.goto(url, { waitUntil: 'networkidle2' });
        const screenshotPath = path.join(process.cwd(), `screenshot.${screenshotFormat}`);
        await page.screenshot({ path: screenshotPath, type: screenshotFormat, fullPage: fullscreen.toLowerCase() === 'true' });

        await browser.close();

        const fileContent = fs.readFileSync(screenshotPath);
        const currentYearMonth = getCurrentYearMonth();
        const fileName = Date.now();
        const uploadParams = {
            Bucket: bucketName,
            Key: `screenshots/${currentYearMonth}/${fileName}.${screenshotFormat}`,
            Body: fileContent,
            ContentType: `image/${screenshotFormat === 'jpg' ? 'jpeg' : screenshotFormat}`,
        };

        const data = await s3Client.send(new PutObjectCommand(uploadParams));

        const fileUrl = `${s3Domain}/screenshots/${currentYearMonth}/${fileName}.${screenshotFormat}`;

        res.status(200).json({
            status: 'success',
            message: 'Screenshot uploaded successfully!',
            url: fileUrl,
            //   s3Response: data,  // Optionally include S3 response data for debugging purposes
        });

        fs.unlinkSync(screenshotPath);
    } catch (error) {
        console.error('Error capturing screenshot:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error capturing screenshot',
            error: error.message,
        });
    }
});

// 启动服务器
app.listen(port, () => {
    console.log(`Screenshot API listening at http://localhost:${port}`);
});
