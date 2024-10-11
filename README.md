# Puppeteer Screenshot API

This project provides an API for capturing website screenshots using Puppeteer. It supports various screen resolutions, formats, mobile device emulation, and uploads the screenshots to AWS S3. The API also includes support for capturing full-page screenshots and scaling to common screen ratios.

## Features

- Capture screenshots of any URL
- Support for different image formats: `png`, `jpg`, `webp`
- Full-page screenshots or viewport-specific screenshots
- Support for mobile device emulation (e.g., `iPhone 15 Plus`, `Pixel 5`, `Nexus 10`)
- Upload screenshots to AWS S3, with automatic directory structure based on the current year and month
- Structured response, including status and uploaded file URL
- Error handling for unsupported devices

## Prerequisites

- **Node.js** (v18 or higher)
- **AWS Account** with S3 bucket for storing screenshots
- **Puppeteer** dependencies installed on your system (automatically installed with the project)

## Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/laggards/puppeteer-screenshot-api.git
    cd puppeteer-screenshot-api
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Set up environment variables by creating a `.env` file in the root directory:

    ```bash
    touch .env
    ```

4. Add your AWS credentials and configuration in the `.env` file:

    ```bash
    AWS_REGION=your-aws-region
    AWS_ACCESS_KEY_ID=your-access-key-id
    AWS_SECRET_ACCESS_KEY=your-secret-access-key
    S3_BUCKET_NAME=your-s3-bucket-name
    S3_DOMAIN=https://your-s3-domain
    ```

## Running the API Locally

To start the API locally, run the following command:

```bash
node app.js
